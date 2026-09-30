import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "@/lib/recharts";
import { Database, FileWarning, Gavel, History, UserCheck, Sparkles, Activity, Network, Bug, FileDown } from "lucide-react";

import { apiGet, apiPost } from "@/lib/api";
import type { CorpusLoadResult, Stats, User, HealthScoreResponse } from "@/lib/types";
import { formatError, RunScanButton } from "@/components/AppShell";
import { BulkUploadCard } from "@/components/BulkUploadCard";
import { CorpusCard } from "@/components/CorpusCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FINDING_TYPES = ["contradiction", "duplicate", "stale", "unsupported"] as const;

function KpiCard({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: number; testId: string }) {
  return (
    <Card data-testid={testId} className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{icon}</span>
        <div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">{value.toLocaleString()}</div>
          <div className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const PIPELINE_STEPS: { key: keyof Stats["pipeline"]; label: string }[] = [
  { key: "ingested", label: "Ingested" },
  { key: "quarantined", label: "Quarantined" },
  { key: "claims_indexed", label: "Claims indexed" },
  { key: "candidate_pairs", label: "Candidate pairs" },
  { key: "auto_fixed", label: "Auto-fixed" },
  { key: "awaiting_human", label: "Awaiting human" },
];

export default function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiGet<User>("/auth/me"), retry: false });
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => apiGet<Stats>("/stats"), retry: false });
  const health = useQuery({ queryKey: ["health-score"], queryFn: () => apiGet<HealthScoreResponse>("/health-score"), retry: false });
  const role = me.data?.role ?? "viewer";
  const isAdmin = role === "admin";

  const s = stats.data;
  const chartData = FINDING_TYPES.map((t) => ({ type: t, count: s?.findings_by_type?.[t] ?? 0 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Continuous audit for stale, duplicated, contradictory and unsupported knowledge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {role !== "viewer" && <RunScanButton disabled={false} />}
        </div>
      </div>

      {/* New Features Quick Launcher Banner */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Enhanced Features Active</span>
                {health.data && (
                  <Badge className="bg-indigo-600 text-white text-[10px]">
                    Health Score: {health.data.overall_score}/100 ({health.data.grade})
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Explore dedicated tabs for Health Score, Self-Healing RAG (Before/After), Knowledge Graph, Red-Team Suite, and PDF Reports.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/health")}
              className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Activity className="mr-1 h-3.5 w-3.5" /> Health Score
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/self-healing")}
              className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Self-Healing RAG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/graph")}
              className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Network className="mr-1 h-3.5 w-3.5" /> Knowledge Graph
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/red-team")}
              className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              <Bug className="mr-1 h-3.5 w-3.5" /> Red-Team
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/reports")}
              className="h-8 bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
            >
              <FileDown className="mr-1 h-3.5 w-3.5" /> PDF Export
            </Button>
          </div>
        </div>
      </div>

      <CorpusCard isAdmin={isAdmin} />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={<Database className="h-4 w-4" />} label="Documents" value={s?.documents ?? 0} testId="kpi-documents" />
        <KpiCard icon={<FileWarning className="h-4 w-4" />} label="Quarantined" value={s?.quarantined ?? 0} testId="kpi-quarantined" />
        <KpiCard icon={<Gavel className="h-4 w-4" />} label="Awaiting human" value={s?.awaiting_human ?? 0} testId="kpi-awaiting-human" />
        <KpiCard icon={<UserCheck className="h-4 w-4" />} label="Auto-resolved" value={s?.auto_resolved ?? 0} testId="kpi-auto-resolved" />
        <KpiCard icon={<History className="h-4 w-4" />} label="Ledger versions" value={s?.ledger_versions ?? 0} testId="kpi-ledger-versions" />
      </div>

      {/* pipeline strip */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="pipeline-diagnostic-strip" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {PIPELINE_STEPS.map(({ key, label }, i) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  {i + 1}. {label}
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900" data-testid={`pipeline-${key}`}>
                  {(s?.pipeline?.[key] ?? 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {/* findings-by-type chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings by type</CardTitle>
            <CardDescription>Breakdown across the four supported conflict classes.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} data-testid="chart-findings">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
