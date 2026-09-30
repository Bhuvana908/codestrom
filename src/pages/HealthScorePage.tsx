import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity, Sparkles, Network, Bug, FileDown,
  RefreshCw, Zap, ShieldCheck
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { HealthScoreResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { ExplainabilityModal } from "@/components/ExplainabilityModal";

export default function HealthScorePage() {
  const navigate = useNavigate();
  const [selectedExplainId, setSelectedExplainId] = useState<string | null>(null);

  const { data: healthData, isPending, refetch } = useQuery({
    queryKey: ["health-score"],
    queryFn: () => apiGet<HealthScoreResponse>("/health-score"),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Knowledge Base Health Score & Explainability
            </h1>
            <Badge className="bg-indigo-600 text-white">
              <Activity className="mr-1 h-3 w-3" /> Diagnostic Integrity
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Multi-factor assessment evaluating conflicting knowledge, outdated policies, unsupported claims, and source reliability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Recalculate
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/reports")}
            className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export PDF Audit Report
          </Button>
        </div>
      </div>

      {/* Main Health Score Gauge */}
      {healthData && (
        <HealthScoreGauge
          data={healthData}
          onOpenExplain={(factorId) => setSelectedExplainId(factorId)}
          onNavigateSelfHealing={() => navigate("/self-healing")}
          onNavigateRedTeam={() => navigate("/red-team")}
        />
      )}

      {/* Deep-Dive Explainability Trigger Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Autonomous Explainability Engine
            </h2>
            <p className="text-xs text-slate-500">
              Transparent, evidence-grounded explainability for all active detections and policy divergences.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Zero Black-Box Assertions
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              id: "conf-refund-window",
              title: "Refund Window Conflict (30d vs 90d)",
              impact: "+5.0 pts gain",
              desc: "Contradiction between authoritative official wiki (trust 0.85) and customer support chat notes (trust 0.40).",
            },
            {
              id: "conf-password-rule",
              title: "Password Length Divergence (12 vs 6 char)",
              impact: "+5.0 pts gain",
              desc: "Security policy mandates 12 characters minimum; informal chat allows 6 characters on staging.",
            },
            {
              id: "conf-401k-stale",
              title: "Stale Benefits Policy (401k 4% vs 6%)",
              impact: "+4.0 pts gain",
              desc: "Temporal supersede rule: 2023 4% match policy was superseded by official June 2025 6% policy.",
            },
            {
              id: "conf-unsupported-claims",
              title: "Unsupported Empirical Assertion (300% AI Claim)",
              impact: "+3.5 pts gain",
              desc: "Authority framing ('Studies show') without empirical citation marker or verifiable benchmark URL.",
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedExplainId(item.id)}
              className="group cursor-pointer rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/20 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {item.title}
                </span>
                <Badge className="bg-emerald-50 text-emerald-700 text-[10px] dark:bg-emerald-950 dark:text-emerald-300">
                  {item.impact}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {item.desc}
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Zap className="h-3.5 w-3.5" />
                <span>Open Explainability Breakdown →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Universal Explainability Modal */}
      {selectedExplainId && (
        <ExplainabilityModal
          itemId={selectedExplainId}
          onClose={() => setSelectedExplainId(null)}
          onApplyProposal={() => navigate("/self-healing")}
        />
      )}
    </div>
  );
}
