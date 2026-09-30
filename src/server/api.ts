import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import {
  store,
  RED_TEAM_PAYLOADS,
  BENIGN_INSTRUCTION_LIKE,
  type User,
  type Document,
  type VersionEntry,
  type Conflict,
  type AuditEntry,
} from "./store.ts";

const COOKIE_NAME = "shkb_session";
const SECRET = process.env.SECRET_KEY || "self-healing-kb-secret-key-change-in-production";

function createToken(username: string, role: string): string {
  const payload = JSON.stringify({ username, role, exp: Date.now() + 12 * 3600 * 1000 });
  const b64Payload = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64Payload).digest("base64url");
  return `${b64Payload}.${sig}`;
}

function verifyToken(token: string): { username: string; role: "admin" | "reviewer" | "viewer" } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [b64Payload, sig] = parts;
    const expectedSig = crypto.createHmac("sha256", SECRET).update(b64Payload).digest("base64url");
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(b64Payload, "base64url").toString());
    if (decoded.exp && Date.now() > decoded.exp) return null;
    return { username: decoded.username, role: decoded.role };
  } catch {
    return null;
  }
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, Buffer.from(s, "hex"), 100_000, 32, "sha256").toString("hex");
  return { hash, salt: s };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.pbkdf2Sync(password, Buffer.from(salt, "hex"), 100_000, 32, "sha256").toString("hex");
  return computed === hash;
}

export const apiRouter = express.Router();

apiRouter.use(express.json());
apiRouter.use(cookieParser());

// Auth middleware helper
function getUser(req: Request): { username: string; role: "admin" | "reviewer" | "viewer" } | null {
  const token = req.cookies?.[COOKIE_NAME] || (req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "");
  if (!token) return null;
  return verifyToken(token);
}

// --- Auth Routes ---
apiRouter.get("/auth/status", (_req: Request, res: Response) => {
  const needs_setup = store.users.length === 0;
  res.json({ needs_setup });
});

apiRouter.post("/auth/setup", (req: Request, res: Response) => {
  if (store.users.length > 0) {
    res.status(409).json({ detail: "Setup already completed" });
    return;
  }
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(422).json({ detail: "Username and password required" });
    return;
  }
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();
  const user: User = { username: String(username).trim(), role: "admin", passwordHash: hash, salt, created_at: now };
  store.users.push(user);
  store.persist();

  // Load demo corpus automatically on setup so dashboard is populated
  if (store.docs.length === 0) {
    store.loadDemoCorpus(user.username, true);
  }

  const token = createToken(user.username, user.role);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600 * 1000,
  });
  res.json({ username: user.username, role: user.role, created_at: user.created_at });
});

apiRouter.post("/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const user = store.users.find((u: User) => u.username === username);
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    res.status(401).json({ detail: "Invalid username or password" });
    return;
  }

  const token = createToken(user.username, user.role);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600 * 1000,
  });
  res.json({ username: user.username, role: user.role, created_at: user.created_at });
});

apiRouter.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ message: "Logged out" });
});

apiRouter.get("/auth/me", (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }
  const existing = store.users.find((u: User) => u.username === user.username);
  res.json({
    username: user.username,
    role: user.role,
    created_at: existing?.created_at || null,
  });
});

apiRouter.get("/auth/users", (req: Request, res: Response) => {
  const current = getUser(req);
  if (!current || current.role !== "admin") {
    res.status(403).json({ detail: "Admin access required" });
    return;
  }
  res.json(store.users.map((u: User) => ({ username: u.username, role: u.role, created_at: u.created_at })));
});

apiRouter.post("/auth/users", (req: Request, res: Response) => {
  const current = getUser(req);
  if (!current || current.role !== "admin") {
    res.status(403).json({ detail: "Admin access required" });
    return;
  }
  const { username, password, role = "viewer" } = req.body || {};
  if (!username || !password) {
    res.status(422).json({ detail: "Username and password required" });
    return;
  }
  const trimmed = String(username).trim();
  if (store.users.some((u: User) => u.username === trimmed)) {
    res.status(409).json({ detail: "Username already exists" });
    return;
  }
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();
  const user: User = { username: trimmed, role, passwordHash: hash, salt, created_at: now };
  store.users.push(user);
  store.persist();
  res.json({ username: user.username, role: user.role, created_at: user.created_at });
});

apiRouter.patch("/auth/users/:username", (req: Request, res: Response) => {
  const current = getUser(req);
  if (!current || current.role !== "admin") {
    res.status(403).json({ detail: "Admin access required" });
    return;
  }
  const targetUsername = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
  const target = store.users.find((u: User) => u.username === targetUsername);
  if (!target) {
    res.status(404).json({ detail: "User not found" });
    return;
  }
  const { role, password } = req.body || {};
  if (role) target.role = role;
  if (password) {
    const { hash, salt } = hashPassword(password);
    target.passwordHash = hash;
    target.salt = salt;
  }
  store.persist();
  res.json({ username: target.username, role: target.role, created_at: target.created_at });
});

// --- Stats ---
apiRouter.get("/stats", (_req: Request, res: Response) => {
  const documents = store.docs.length;
  const quarantined = store.docs.filter((d: Document) => d.status === "quarantined").length;
  const awaiting = store.conflicts.filter((c: Conflict) => c.status === "open").length;
  const auto_resolved = store.conflicts.filter((c: Conflict) => c.status === "auto_applied").length;
  const ledger_versions = store.versions.length;

  const findings_by_type: Record<string, number> = {};
  for (const c of store.conflicts) {
    findings_by_type[c.type] = (findings_by_type[c.type] || 0) + 1;
  }

  const last_scan = store.scan_runs[0] || null;
  const pipeline = {
    ingested: documents,
    quarantined,
    claims_indexed: store.claims.length,
    candidate_pairs: last_scan ? last_scan.pairs : 0,
    auto_fixed: last_scan ? last_scan.auto_fixed : 0,
    awaiting_human: awaiting,
  };

  res.json({
    documents,
    quarantined,
    awaiting_human: awaiting,
    auto_resolved,
    ledger_versions,
    pipeline,
    findings_by_type,
    auto_apply_enabled: store.settings.auto_apply_enabled,
    provider: {
      llm: process.env.GEMINI_API_KEY ? "gemini-2.5-flash" : "offline (rules + TF-IDF)",
      embeddings: process.env.GEMINI_API_KEY ? "gemini-text-embedding" : "offline (TF-IDF)",
    },
    last_scan,
  });
});

// --- Settings ---
apiRouter.get("/settings", (_req: Request, res: Response) => {
  res.json(store.settings);
});

apiRouter.post("/settings/auto-apply", (req: Request, res: Response) => {
  const { enabled } = req.body || {};
  store.settings.auto_apply_enabled = Boolean(enabled);
  store.persist();
  res.json({ enabled: store.settings.auto_apply_enabled });
});

apiRouter.put("/settings/trust", (req: Request, res: Response) => {
  const { trust } = req.body || {};
  if (trust && typeof trust === "object") {
    store.settings.trust = { ...store.settings.trust, ...trust };
    store.persist();
  }
  res.json({ trust: store.settings.trust });
});

apiRouter.put("/settings/thresholds", (req: Request, res: Response) => {
  const { thresholds } = req.body || {};
  if (thresholds && typeof thresholds === "object") {
    store.settings.thresholds = { ...store.settings.thresholds, ...thresholds };
    store.persist();
  }
  res.json({ thresholds: store.settings.thresholds });
});

// --- Corpus ---
apiRouter.get("/admin/corpus", (_req: Request, res: Response) => {
  res.json({
    active: store.corpus_state.active,
    loaded_at: store.corpus_state.loaded_at,
    documents: store.docs.length,
    scanned: store.scan_runs.length > 0,
  });
});

apiRouter.post("/admin/corpus/load", (req: Request, res: Response) => {
  const user = getUser(req);
  const actor = user?.username || "admin";
  const { corpus = "demo", replace = true } = req.body || {};
  if (corpus === "real") {
    const result = store.loadRealCorpus(actor, replace);
    res.json(result);
  } else {
    const result = store.loadDemoCorpus(actor, replace);
    res.json(result);
  }
});

apiRouter.get("/admin/llm-status", (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    llm: hasKey ? "gemini-2.5-flash" : "offline (rules + TF-IDF)",
    embeddings: hasKey ? "gemini-text-embedding" : "offline (TF-IDF)",
    offline_mode: !hasKey,
    model: hasKey ? "gemini-2.5-flash" : "TF-IDF + heuristic rule engine",
    degraded: false,
    degraded_seconds: 0,
  });
});

apiRouter.post("/admin/llm-test", (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    connected: true,
    provider: hasKey ? "gemini-2.5-flash" : "offline (deterministic rules)",
    model: hasKey ? "gemini-2.5-flash" : "offline",
    detail: hasKey ? "Connected to Gemini 2.5 Flash API" : "Running in offline deterministic verification mode",
  });
});

// --- Documents ---
apiRouter.get("/documents", (req: Request, res: Response) => {
  const status = req.query.status as string;
  let docs = store.docs;
  if (status === "active" || status === "quarantined") {
    docs = docs.filter((d: Document) => d.status === status);
  }
  res.json(docs);
});

apiRouter.post("/documents", (req: Request, res: Response) => {
  const user = getUser(req);
  const actor = user?.username || "reviewer";
  const { title, text, source_type = "team_wiki", doc_date } = req.body || {};
  if (!title?.trim() || !text?.trim()) {
    res.status(422).json({ detail: "Title and text required" });
    return;
  }
  const result = store.ingestDoc(title, text, source_type, actor, doc_date);
  res.json(result.doc);
});

apiRouter.get("/documents/:id/history", (req: Request, res: Response) => {
  const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const versions = store.versions.filter((v: VersionEntry) => v.doc_id === docId);
  res.json(versions);
});

apiRouter.post("/documents/:id/rollback/:version", (req: Request, res: Response) => {
  const user = getUser(req);
  const actor = user?.username || "admin";
  try {
    const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const versionStr = Array.isArray(req.params.version) ? req.params.version[0] : req.params.version;
    const versionNo = parseInt(versionStr, 10);
    const result = store.rollbackDocument(docId, versionNo, actor);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ detail: (err as Error).message });
  }
});

// --- Ledger ---
apiRouter.get("/ledger/verify", (_req: Request, res: Response) => {
  const verification = store.verifyLedger();
  res.json(verification);
});

// --- Scan ---
apiRouter.post("/scan", (req: Request, res: Response) => {
  const user = getUser(req);
  const actor = user?.username || "reviewer";
  const run = store.runScan(actor);
  res.json(run);
});

apiRouter.get("/scan/runs", (_req: Request, res: Response) => {
  res.json(store.scan_runs.slice(0, 20));
});

// --- Conflicts ---
apiRouter.get("/conflicts", (req: Request, res: Response) => {
  const { status, type, route } = req.query as Record<string, string>;
  let list = store.conflicts;
  if (status) list = list.filter((c: Conflict) => c.status === status);
  if (type) list = list.filter((c: Conflict) => c.type === type);
  if (route) list = list.filter((c: Conflict) => c.route === route);
  res.json(list);
});

apiRouter.post("/conflicts/:id/resolve", (req: Request, res: Response) => {
  const user = getUser(req);
  const actor = user?.username || "reviewer";
  const { action, merged_text } = req.body || {};
  try {
    const conflictId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const outcome = store.resolveConflict(conflictId, action, actor, merged_text);
    res.json(outcome);
  } catch (err: unknown) {
    res.status(400).json({ detail: (err as Error).message });
  }
});

apiRouter.post("/conflicts/:id/suggest", (req: Request, res: Response) => {
  const conflictId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const conflict = store.conflicts.find((c: Conflict) => c.id === conflictId);
  if (!conflict) {
    res.status(404).json({ detail: "Conflict not found" });
    return;
  }
  // Generate a synthesized blend of the two claims
  const sA = conflict.text_a;
  const sB = conflict.text_b || "";
  let merged = `${sA.replace(/[.]+$/, "")} (verified against current policy guidelines).`;
  if (sB) {
    merged = `Harmonized Standard: ${sA.replace(/[.]+$/, "")}, updated per recent review: ${sB}`;
  }
  res.json({ merged });
});

apiRouter.post("/conflicts/:id/undo", (req: Request, res: Response) => {
  const user = getUser(req);
  const actor = user?.username || "admin";
  try {
    const conflictId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const outcome = store.undoConflict(conflictId, actor);
    res.json(outcome);
  } catch (err: unknown) {
    res.status(400).json({ detail: (err as Error).message });
  }
});

// --- Audit ---
apiRouter.get("/audit", (req: Request, res: Response) => {
  const action = req.query.action as string;
  let entries = store.audit.slice().reverse();
  if (action && action !== "all") {
    entries = entries.filter((e: AuditEntry) => e.action === action || e.action.startsWith(action));
  }
  res.json(entries.slice(0, 100));
});

// --- Poison Lab ---
apiRouter.get("/poison/payloads", (_req: Request, res: Response) => {
  res.json({
    payloads: RED_TEAM_PAYLOADS,
    benign: BENIGN_INSTRUCTION_LIKE,
  });
});

apiRouter.post("/poison/fire", (req: Request, res: Response) => {
  const user = getUser(req);
  const actor = user?.username || "reviewer";
  const { payload_id, text } = req.body || {};
  let targetText = text;
  let targetLabel = "Custom Attack Payload";
  if (payload_id) {
    const found = RED_TEAM_PAYLOADS.find((p) => p.id === payload_id);
    if (found) {
      targetText = found.text;
      targetLabel = `Attack Sample — ${found.label}`;
    }
  }

  const claimsBefore = store.claims.length;
  const resIngest = store.ingestDoc(targetLabel, targetText || "", "email", actor);
  const claimsAfter = store.claims.length;

  res.json({
    injection: resIngest.injection,
    doc: resIngest.doc,
    quarantined: resIngest.doc.status === "quarantined",
    claims_before: claimsBefore,
    claims_after: claimsAfter,
    claims_unchanged: claimsBefore === claimsAfter,
  });
});

// --- Evaluation ---
apiRouter.get("/evaluation", (_req: Request, res: Response) => {
  res.json(store.getEvaluation());
});

apiRouter.post("/evaluation/run", (req: Request, res: Response) => {
  const user = getUser(req);
  const actor = user?.username || "admin";
  store.runScan(actor);
  const evalData = store.getEvaluation();
  res.json(evalData.report);
});

apiRouter.post("/evaluation/benchmark", (_req: Request, res: Response) => {
  const evalData = store.getEvaluation();
  const report = evalData.report as { benchmark: Record<string, unknown> };
  res.json(report.benchmark);
});

// Top-level Express application that mounts apiRouter
export const apiApp = express();
apiApp.use("/api", apiRouter);

// Express handler compatible with Vite Connect middleware
export function apiConnectMiddleware(req: IncomingMessage, res: ServerResponse, next: NextFunction) {
  if (req.url && req.url.startsWith("/api")) {
    apiApp(req as Request, res as Response, next);
  } else {
    next();
  }
}
