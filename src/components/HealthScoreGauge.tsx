import React from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, TrendingUp,
  HelpCircle, ArrowUpRight, CheckCircle2, ChevronRight, Activity
} from "lucide-react";
import type { HealthScoreResponse, HealthFactor } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HealthScoreGaugeProps {
  data: HealthScoreResponse;
  onOpenExplain?: (factorId: string) => void;
  onNavigateSelfHealing?: () => void;
  onNavigateRedTeam?: () => void;
}

export function HealthScoreGauge({
  data,
  onOpenExplain,
  onNavigateSelfHealing,
  onNavigateRedTeam,
}: HealthScoreGaugeProps) {
  const score = data.overall_score;

  // Grade color
  const gradeColors = {
    A: "text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    B: "text-blue-600 border-blue-500 bg-blue-50 dark:bg-blue-950/40",
    C: "text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/40",
    D: "text-orange-600 border-orange-500 bg-orange-50 dark:bg-orange-950/40",
    F: "text-rose-600 border-rose-500 bg-rose-50 dark:bg-rose-950/40",
  }[data.grade] || "text-indigo-600 border-indigo-500 bg-indigo-50";

  // Score meter stroke offset for SVG circle
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Top Banner */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          {/* Circular SVG Gauge */}
          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                className={`transition-all duration-1000 ease-out ${
                  score >= 85
                    ? "stroke-emerald-500"
                    : score >= 70
                    ? "stroke-blue-500"
                    : score >= 50
                    ? "stroke-amber-500"
                    : "stroke-rose-500"
                }`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {score}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                / 100 HEALTH
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Knowledge Base Health Score
              </h2>
              <span
                className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-bold ${gradeColors}`}
              >
                Grade {data.grade}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Real-time integrity assessment across 8 weighted operational pillars.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs font-medium ${
                  score >= 80
                    ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                {data.status}
              </Badge>

              <span className="text-xs text-slate-400">
                {data.open_issues} active issues impacting score
              </span>
            </div>
          </div>
        </div>

        {/* Quick Win sensitivity callout */}
        <div className="flex flex-col gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 text-xs dark:border-indigo-950 dark:bg-indigo-950/30 sm:max-w-xs">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-900 dark:text-indigo-300">
            <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Sensitivity / Optimization</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            {data.sensitivity.quickest_win}
          </p>
          <div className="mt-1 flex gap-2">
            {onNavigateSelfHealing && (
              <Button
                size="sm"
                className="h-7 bg-indigo-600 px-3 text-[11px] font-medium text-white hover:bg-indigo-700"
                onClick={onNavigateSelfHealing}
              >
                Launch Self-Healing RAG
              </Button>
            )}
            {onNavigateRedTeam && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-[11px] font-medium"
                onClick={onNavigateRedTeam}
              >
                Red-Team Probes
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 8 Factor Breakdown Grid */}
      <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Health Factor Matrix (8 Diagnostic Dimensions)
          </h3>
          <span className="text-[11px] text-slate-400">
            Click any factor for explainability & remediation
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.factors.map((factor) => {
            const pct = Math.round((factor.score / factor.max) * 100);
            return (
              <div
                key={factor.id}
                className="group relative flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 transition-all hover:border-indigo-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-800"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {factor.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        factor.status === "healthy"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : factor.status === "warning"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {factor.score}/{factor.max} pts
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 80
                          ? "bg-emerald-500"
                          : pct >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                    {factor.recommendation}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800/80">
                  <span>Weight: {factor.weight}</span>
                  {factor.issues_detected > 0 && (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {factor.issues_detected} issue(s)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
