import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles, Check, X, ArrowRight, ShieldCheck, History,
  FileText, ExternalLink, HelpCircle, AlertCircle, RefreshCw, Zap
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { SelfHealingProposal } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExplainabilityModal } from "@/components/ExplainabilityModal";

export default function SelfHealingPage() {
  const qc = useQueryClient();
  const [selectedExplainId, setSelectedExplainId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: proposals, isPending, refetch } = useQuery({
    queryKey: ["rag", "proposals"],
    queryFn: () => apiGet<SelfHealingProposal[]>("/rag/proposals"),
    refetchInterval: 15000,
  });

  const resolveMut = useMutation({
    mutationFn: ({ conflictId, action }: { conflictId: string; action: "accept" | "reject" }) =>
      apiPost(`/rag/resolve/${conflictId}`, { action }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "accept"
          ? "Correction applied & anchored in tamper-evident ledger!"
          : "Proposal rejected."
      );
      qc.invalidateQueries({ queryKey: ["rag", "proposals"] });
      qc.invalidateQueries({ queryKey: ["conflicts"] });
      qc.invalidateQueries({ queryKey: ["health-score"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to resolve conflict");
    },
  });

  const openProposals = (proposals || []).filter((p) => p.status === "open");
  const filtered = filterType === "all"
    ? openProposals
    : openProposals.filter((p) => p.type === filterType);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Self-Healing RAG Workspace
            </h1>
            <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">
              <Sparkles className="mr-1 h-3 w-3" /> Autonomous Repair
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Compare detected knowledge defects with AI-formulated repairs. Accept to append a cryptographic version block.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh Proposals
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {[
          { key: "all", label: `All Pending (${openProposals.length})` },
          { key: "contradiction", label: "Contradictions" },
          { key: "stale", label: "Outdated / Stale" },
          { key: "duplicate", label: "Duplicates" },
          { key: "unsupported", label: "Unsupported" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === tab.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm">Evaluating knowledge consistency and formulating repair vectors…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
            Knowledge Base Fully Self-Healed
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            All detected contradictions, stale claims, and unsupported statements have been reviewed and reconciled.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Proposal Header Banner */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Badge
                    variant="outline"
                    className="capitalize font-semibold text-xs border-indigo-200 bg-indigo-50/50 text-indigo-700 dark:border-indigo-900 dark:text-indigo-300"
                  >
                    {item.type}
                  </Badge>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Target: {item.target_doc_title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Confidence: <strong className="text-slate-800 dark:text-slate-200">{item.confidence}%</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-indigo-600 dark:text-indigo-400"
                    onClick={() => setSelectedExplainId(item.conflict_id)}
                  >
                    <Zap className="mr-1 h-3.5 w-3.5" /> Explain Logic
                  </Button>
                </div>
              </div>

              {/* BEFORE vs AFTER Split View */}
              <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-slate-800">
                {/* BEFORE PANEL (Problematic State) */}
                <div className="flex flex-col justify-between p-5 bg-rose-50/20 dark:bg-rose-950/10">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                          1
                        </span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                          BEFORE (Detected Defect)
                        </h4>
                      </div>
                      <Badge variant="outline" className="border-rose-200 text-rose-700 text-[10px]">
                        {item.before.problem_label}
                      </Badge>
                    </div>

                    <div className="mt-3 rounded-lg border border-rose-200/70 bg-white p-3.5 text-xs text-slate-800 shadow-2xs dark:border-rose-950 dark:bg-slate-800 dark:text-slate-200">
                      <p className="font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.before.original_text.split(item.before.problematic_sentence).map((part, i, arr) => (
                          <React.Fragment key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <mark className="rounded bg-rose-100 px-1 py-0.5 font-bold text-rose-900 dark:bg-rose-900/60 dark:text-rose-100">
                                {item.before.problematic_sentence}
                              </mark>
                            )}
                          </React.Fragment>
                        ))}
                      </p>
                    </div>

                    {item.before.competing_context && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Contradictory Source in Index:
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {item.before.competing_context.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Trust {Math.round(item.before.competing_context.trust * 100)}% · {item.before.competing_context.date}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          "{item.before.competing_context.authoritative_claim}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2 text-[11px] text-slate-400">
                    Source: {item.before.source_type} · Trust {Math.round(item.before.trust * 100)}%
                  </div>
                </div>

                {/* AFTER PANEL (Self-Healing Proposed State) */}
                <div className="flex flex-col justify-between p-5 bg-emerald-50/20 dark:bg-emerald-950/10">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                          2
                        </span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          AFTER (Proposed Self-Healing Correction)
                        </h4>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        Cryptographic Hash Ready
                      </Badge>
                    </div>

                    <div className="mt-3 rounded-lg border border-emerald-200/70 bg-white p-3.5 text-xs text-slate-800 shadow-2xs dark:border-emerald-950 dark:bg-slate-800 dark:text-slate-200">
                      <p className="font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.after.proposed_text.split(item.after.replacement_sentence).map((part, i, arr) => (
                          <React.Fragment key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <mark className="rounded bg-emerald-100 px-1 py-0.5 font-bold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
                                {item.after.replacement_sentence}
                              </mark>
                            )}
                          </React.Fragment>
                        ))}
                      </p>
                    </div>

                    <div className="mt-3 space-y-1.5 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-[11px] text-slate-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-slate-300">
                      <div>
                        <strong className="text-emerald-900 dark:text-emerald-300">Why Proposed:</strong>{" "}
                        {item.after.why_proposed}
                      </div>
                      <div>
                        <strong className="text-emerald-900 dark:text-emerald-300">Evidence Basis:</strong>{" "}
                        {item.after.supporting_evidence}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-2">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Appends version block to tamper-evident ledger upon confirmation.
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resolveMut.isPending}
                        onClick={() => resolveMut.mutate({ conflictId: item.conflict_id, action: "reject" })}
                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={resolveMut.isPending}
                        onClick={() => resolveMut.mutate({ conflictId: item.conflict_id, action: "accept" })}
                        className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Accept Correction
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explainability Modal */}
      {selectedExplainId && (
        <ExplainabilityModal
          itemId={selectedExplainId}
          onClose={() => setSelectedExplainId(null)}
          onApplyProposal={(id) => resolveMut.mutate({ conflictId: id, action: "accept" })}
        />
      )}
    </div>
  );
}
