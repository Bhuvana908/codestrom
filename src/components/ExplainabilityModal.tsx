import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, BookOpen,
  Info, ExternalLink, Zap, HelpCircle, X
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ExplainabilityResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ExplainabilityModalProps {
  itemId: string | null;
  onClose: () => void;
  onApplyProposal?: (conflictId: string) => void;
}

export function ExplainabilityModal({ itemId, onClose, onApplyProposal }: ExplainabilityModalProps) {
  const { data: explanation, isPending, isError } = useQuery({
    queryKey: ["explain", itemId],
    queryFn: () => apiGet<ExplainabilityResponse>(`/explain/${itemId}`),
    enabled: Boolean(itemId),
    retry: false,
  });

  if (!itemId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">Explainability Panel</h3>
                {explanation && (
                  <Badge variant="outline" className="text-xs uppercase tracking-wide">
                    {explanation.type}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">Transparent AI decision logic and evidence provenance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="mt-3 text-sm">Compiling explainability graph…</p>
            </div>
          ) : isError || !explanation ? (
            <div className="py-8 text-center text-slate-500">
              <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
              <p className="mt-2 text-sm font-medium">Explainability profile not found for this item</p>
            </div>
          ) : (
            <>
              {/* What and Why */}
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950 dark:bg-indigo-950/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Detection Summary
                </div>
                <h4 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {explanation.title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {explanation.why_detected}
                </p>
              </div>

              {/* Confidence & Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-[11px] font-medium text-slate-500">Confidence Score</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                    {explanation.confidence_info.confidence_score}%
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {explanation.confidence_info.level}
                  </div>
                </div>

                {explanation.confidence_info.semantic_similarity !== null && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[11px] font-medium text-slate-500">Semantic Similarity</div>
                    <div className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                      {explanation.confidence_info.semantic_similarity}%
                    </div>
                    <div className="text-[11px] text-slate-400">Vector cosine distance</div>
                  </div>
                )}

                {explanation.confidence_info.trust_differential !== null && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[11px] font-medium text-slate-500">Trust Differential</div>
                    <div className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                      {explanation.confidence_info.trust_differential}%
                    </div>
                    <div className="text-[11px] text-indigo-600">Authority precedence</div>
                  </div>
                )}
              </div>

              {/* Affected Documents & Sources */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Affected Knowledge Documents ({explanation.affected_documents.length})
                </div>
                <div className="space-y-2">
                  {explanation.affected_documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {doc.title || doc.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {doc.source_type && (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {doc.source_type.replace("_", " ")}
                            </Badge>
                          )}
                          {doc.trust !== undefined && (
                            <Badge
                              className={`text-[10px] font-mono ${
                                doc.trust >= 0.8
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              Trust {Math.round(doc.trust * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      {doc.problematic_sentence && (
                        <div className="mt-2 rounded bg-slate-50 p-2 font-mono text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                          "{doc.problematic_sentence}"
                        </div>
                      )}
                      <div className="mt-1 text-[11px] text-slate-400">
                        Role in Detection: <span className="font-medium text-slate-600 dark:text-slate-300">{doc.role}</span>
                        {doc.date && ` · Registered on ${doc.date}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence & Detection Rule */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Evidence Provenance & Rule
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 space-y-2">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">Heuristic / Rule:</span>{" "}
                    {explanation.evidence.detection_rule}
                  </div>
                  {explanation.evidence.primary_quote && (
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">Primary Anchor:</span>{" "}
                      <span className="font-mono text-[11px]">"{explanation.evidence.primary_quote}"</span>
                    </div>
                  )}
                  {explanation.evidence.competing_quote && (
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">Contradictory Target:</span>{" "}
                      <span className="font-mono text-[11px]">"{explanation.evidence.competing_quote}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Action & Score Impact */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/30">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    System Recommendation
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    Impact: {explanation.score_impact.immediate_health_gain} Health
                  </Badge>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {explanation.recommended_action}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {explanation.score_impact.what_changes}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            Audit ID: <code className="font-mono text-[11px]">{itemId}</code>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Dismiss
            </Button>
            {onApplyProposal && (
              <Button
                size="sm"
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => {
                  onApplyProposal(itemId);
                  onClose();
                }}
              >
                Apply Recommended Fix
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
