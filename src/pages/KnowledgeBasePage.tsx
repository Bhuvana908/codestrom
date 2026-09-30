import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen, Plus, ShieldAlert, ShieldCheck, History,
  RotateCcw, FileText, Upload, Search, Filter, Lock
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { Document, VersionEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function KnowledgeBasePage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Ingestion form state
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState<string>("official_wiki");

  const { data: documents, isPending } = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiGet<Document[]>("/documents"),
  });

  const { data: history, isPending: historyPending } = useQuery({
    queryKey: ["documents", selectedDoc?.id, "history"],
    queryFn: () => apiGet<VersionEntry[]>(`/documents/${selectedDoc?.id}/history`),
    enabled: Boolean(selectedDoc),
  });

  const addDocMut = useMutation({
    mutationFn: (body: { title: string; text: string; source_type: string }) =>
      apiPost<Document>("/documents", body),
    onSuccess: (newDoc) => {
      if (newDoc.status === "quarantined") {
        toast.error("Document contained prompt-injection threat and was quarantined!");
      } else {
        toast.success("Document ingested and indexed successfully!");
      }
      setIsAddOpen(false);
      setTitle("");
      setText("");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["health-score"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to ingest document"),
  });

  const rollbackMut = useMutation({
    mutationFn: ({ docId, verNo }: { docId: string; verNo: number }) =>
      apiPost(`/documents/${docId}/rollback/${verNo}`, {}),
    onSuccess: () => {
      toast.success("Rolled back document (appended new version to ledger).");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["health-score"] });
    },
    onError: (err: any) => toast.error(err.message || "Rollback failed"),
  });

  const filteredDocs = (documents || []).filter((doc) => {
    if (filter === "active" && doc.status !== "active") return false;
    if (filter === "quarantined" && doc.status !== "quarantined") return false;
    if (filter === "policy" && doc.source_type !== "signed_policy") return false;
    if (search.trim()) {
      return (
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.id.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Enterprise Knowledge Base
            </h1>
            <Badge className="bg-indigo-600 text-white">
              <BookOpen className="mr-1 h-3 w-3" /> Indexed Repository
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse active company policies, wikis, and quarantined documents with full version provenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Ingest New Document
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          {[
            { key: "all", label: `All Documents (${documents?.length ?? 0})` },
            { key: "active", label: "Active" },
            { key: "quarantined", label: "Quarantined" },
            { key: "policy", label: "Signed Policies" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or ID..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Main Grid: Docs List + Details Drawer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Document Cards */}
        <div className="col-span-2 space-y-3">
          {isPending ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              No matching documents found in repository.
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              const isQuarantined = doc.status === "quarantined";

              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/20 shadow-xs dark:bg-indigo-950/20"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {isQuarantined ? (
                          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                        )}
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {doc.title}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>ID: <code className="font-mono">{doc.id}</code></span>
                        <span>·</span>
                        <span>v{doc.current_version_no}</span>
                        <span>·</span>
                        <span>{doc.doc_date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {doc.source_type.replace("_", " ")}
                      </Badge>
                      {isQuarantined ? (
                        <Badge className="bg-rose-600 text-white text-[10px]">Quarantined</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Trust {Math.round(doc.trust * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {isQuarantined && doc.quarantine_reason && (
                    <div className="mt-3 rounded bg-rose-50 p-2.5 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                      <strong>Quarantine Defense:</strong> {doc.quarantine_reason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Doc Details & Version History */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {selectedDoc ? (
            <div className="space-y-4">
              <div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {selectedDoc.source_type}
                </Badge>
                <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  {selectedDoc.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Current Version: v{selectedDoc.current_version_no} · Created: {selectedDoc.created_at}
                </p>
              </div>

              {/* Version History */}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cryptographic Version History
                  </span>
                  <History className="h-4 w-4 text-slate-400" />
                </div>

                {historyPending ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading versions…</div>
                ) : (
                  <div className="space-y-2">
                    {(history || []).map((ver) => {
                      const isCurrent = ver.version_no === selectedDoc.current_version_no;
                      return (
                        <div
                          key={ver.id}
                          className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Version {ver.version_no} {isCurrent && "(Current)"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Seq #{ver.seq}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                            {ver.reason}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>Hash: {ver.hash.slice(0, 12)}…</span>
                            {!isCurrent && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px]"
                                onClick={() =>
                                  rollbackMut.mutate({
                                    docId: selectedDoc.id,
                                    verNo: ver.version_no,
                                  })
                                }
                              >
                                <RotateCcw className="mr-1 h-3 w-3" /> Rollback
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="mt-2 font-medium">Select any document to inspect details & version history</p>
            </div>
          )}
        </div>
      </div>

      {/* Ingest Document Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Ingest Document into Knowledge Base
            </h3>
            <p className="text-xs text-slate-500">
              Document text will be scanned for prompt injections before indexing.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Travel Reimbursement Standard"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Source Type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="signed_policy">Signed Policy (Trust 0.95)</option>
                  <option value="official_wiki">Official Wiki (Trust 0.85)</option>
                  <option value="team_wiki">Team Wiki (Trust 0.60)</option>
                  <option value="email">Email Directive (Trust 0.45)</option>
                  <option value="chat">Chat / Slack Note (Trust 0.35)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Document Text</label>
                <textarea
                  rows={5}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter full text of document..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={addDocMut.isPending || !title || !text}
                onClick={() => addDocMut.mutate({ title, text, source_type: sourceType })}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {addDocMut.isPending ? "Ingesting…" : "Ingest & Index"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
