import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert, ShieldCheck, Link2, RefreshCw,
  History, RotateCcw, AlertTriangle, CheckCircle2, Lock, Unlock, Eye
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { Document, User, VerifyResponse, VersionEntry, AuditEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WordDiff } from "@/components/WordDiff";

export default function LedgerPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"versions" | "audit">("versions");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [compareVersionNo, setCompareVersionNo] = useState<number | null>(null);

  const verify = useQuery({
    queryKey: ["ledger", "verify"],
    queryFn: () => apiGet<VerifyResponse>("/ledger/verify"),
    refetchInterval: 15000,
  });

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiGet<Document[]>("/documents"),
  });

  const allVersions = useQuery({
    queryKey: ["ledger", "versions"],
    queryFn: () => apiGet<VersionEntry[]>("/ledger/versions"),
  });

  const allAudit = useQuery({
    queryKey: ["ledger", "audit"],
    queryFn: () => apiGet<AuditEntry[]>("/ledger/audit"),
  });

  const docHistory = useQuery({
    queryKey: ["history", selectedDocId],
    queryFn: () => apiGet<VersionEntry[]>(`/documents/${selectedDocId}/history`),
    enabled: Boolean(selectedDocId),
  });

  // Tamper Simulation Mutations
  const tamperMut = useMutation({
    mutationFn: () => apiPost("/ledger/tamper-simulate", {}),
    onSuccess: (data: any) => {
      toast.error("Tampering simulated! Mathematical hash chain broken at seq #2.");
      qc.invalidateQueries({ queryKey: ["ledger", "verify"] });
    },
  });

  const restoreMut = useMutation({
    mutationFn: () => apiPost("/ledger/tamper-restore", {}),
    onSuccess: () => {
      toast.success("Ledger restored to pristine cryptographic state.");
      qc.invalidateQueries({ queryKey: ["ledger", "verify"] });
    },
  });

  const rollbackMut = useMutation({
    mutationFn: (v: number) => apiPost(`/documents/${selectedDocId}/rollback/${v}`, {}),
    onSuccess: () => {
      toast.success("Rollback applied — old text appended as a NEW version block.");
      qc.invalidateQueries({ queryKey: ["history", selectedDocId] });
      qc.invalidateQueries({ queryKey: ["ledger", "verify"] });
      qc.invalidateQueries({ queryKey: ["ledger", "versions"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: any) => toast.error(e.message || "Rollback failed"),
  });

  const currentVer = (docHistory.data || []).slice(-1)[0];
  const compareVer = (docHistory.data || []).find((v) => v.version_no === compareVersionNo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Cryptographic Ledger & Audit Trail
            </h1>
            <Badge className="bg-indigo-600 text-white">
              <Link2 className="mr-1 h-3 w-3" /> Append-Only Immutable Chain
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Every document creation, modification, self-healing correction, and red-team probe is linked via SHA-256 hashes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {verify.data?.ok ? (
            <Button
              size="sm"
              variant="outline"
              disabled={tamperMut.isPending}
              onClick={() => tamperMut.mutate()}
              className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
              Simulate Tampering (Judge Demo)
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={restoreMut.isPending}
              onClick={() => restoreMut.mutate()}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Restore Pristine Chain
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ["ledger"] })}
            className="text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-Verify
          </Button>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`rounded-xl border p-4 text-xs ${
          verify.data?.ok
            ? "border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
            : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            {verify.data?.ok ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-rose-600" />
            )}
            <span>
              {verify.data?.ok
                ? "TAMPER-EVIDENT INTEGRITY VERIFIED (ALL CHAINS VALID)"
                : "CRYPTOGRAPHIC INTEGRITY VIOLATION DETECTED"}
            </span>
          </div>

          <Badge
            className={verify.data?.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}
          >
            {verify.data?.ok ? "0 Broken Hashes" : "Hash Mismatch Detected"}
          </Badge>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <strong>Versions Chain:</strong> {verify.data?.versions.message}
          </div>
          <div>
            <strong>Audit Trail:</strong> {verify.data?.audit.message}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("versions")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "versions"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Version Ledger ({allVersions.data?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "audit"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          Audit Ledger ({allAudit.data?.length ?? 0})
        </button>
      </div>

      {activeTab === "versions" ? (
        <div className="space-y-6">
          {/* Document Version Diff Inspector */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Document Version Inspector & Rollback
            </h3>
            <p className="text-xs text-slate-500">
              Pick a document to inspect historical versions and diff against current text.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  setCompareVersionNo(null);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="">Select a document to inspect…</option>
                {(docs.data || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} (v{d.current_version_no})
                  </option>
                ))}
              </select>

              {docHistory.data && docHistory.data.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500">Compare with:</span>
                  {docHistory.data.map((ver) => (
                    <Button
                      key={ver.version_no}
                      size="sm"
                      variant={compareVersionNo === ver.version_no ? "default" : "outline"}
                      onClick={() => setCompareVersionNo(ver.version_no)}
                      className="h-7 text-xs font-mono"
                    >
                      v{ver.version_no}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Diff View */}
            {selectedDocId && currentVer && compareVer && (
              <div className="mt-4 rounded-lg border border-slate-200 p-4 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Comparing v{compareVer.version_no} against current v{currentVer.version_no}:
                  </span>

                  {compareVer.version_no !== currentVer.version_no && (
                    <Button
                      size="sm"
                      disabled={rollbackMut.isPending}
                      onClick={() => rollbackMut.mutate(compareVer.version_no)}
                      className="h-7 bg-amber-600 text-white hover:bg-amber-700 text-xs"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" /> Rollback to v{compareVer.version_no}
                    </Button>
                  )}
                </div>

                <div className="font-mono text-xs">
                  <WordDiff
                    before={compareVer.text}
                    after={currentVer.text}
                    beforeLabel={`Version ${compareVer.version_no}`}
                    afterLabel={`Current Version ${currentVer.version_no}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Full Versions Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                All Anchored Document Versions ({allVersions.data?.length ?? 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="p-3 font-semibold">Seq</th>
                    <th className="p-3 font-semibold">Doc ID</th>
                    <th className="p-3 font-semibold">Ver</th>
                    <th className="p-3 font-semibold">Author</th>
                    <th className="p-3 font-semibold">Reason</th>
                    <th className="p-3 font-semibold">SHA-256 Hash</th>
                    <th className="p-3 font-semibold">Prev Hash</th>
                    <th className="p-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {(allVersions.data || []).map((ver) => (
                    <tr key={ver.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-indigo-600">#{ver.seq}</td>
                      <td className="p-3 font-sans font-medium text-slate-900 dark:text-white">{ver.doc_id}</td>
                      <td className="p-3">v{ver.version_no}</td>
                      <td className="p-3 font-sans text-slate-600 dark:text-slate-300">{ver.author}</td>
                      <td className="p-3 font-sans text-slate-600 dark:text-slate-300">{ver.reason}</td>
                      <td className="p-3 text-slate-500" title={ver.hash}>{ver.hash.slice(0, 14)}…</td>
                      <td className="p-3 text-slate-400" title={ver.prev_hash}>{ver.prev_hash.slice(0, 10)}…</td>
                      <td className="p-3 font-sans text-slate-400">{ver.ts.split("T")[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Full Audit Ledger Table */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cryptographic Audit Log ({allAudit.data?.length ?? 0})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <tr>
                  <th className="p-3 font-semibold">Seq</th>
                  <th className="p-3 font-semibold">Actor</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Target</th>
                  <th className="p-3 font-semibold">Details</th>
                  <th className="p-3 font-semibold">SHA-256 Hash</th>
                  <th className="p-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {(allAudit.data || []).map((aud) => (
                  <tr key={aud.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-indigo-600">#{aud.seq}</td>
                    <td className="p-3 font-sans font-medium text-slate-900 dark:text-white">{aud.actor}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {aud.action}
                      </Badge>
                    </td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-300">{aud.target}</td>
                    <td className="p-3 font-sans text-slate-500 text-[10px]">
                      {JSON.stringify(aud.detail || {})}
                    </td>
                    <td className="p-3 text-slate-500" title={aud.hash}>{aud.hash ? aud.hash.slice(0, 14) + "…" : "-"}</td>
                    <td className="p-3 font-sans text-slate-400">{aud.ts.replace("T", " ").slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
