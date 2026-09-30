import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

import { apiGet } from "@/lib/api";
import type { NeedsSetup, User } from "@/lib/types";
import { FullSplash } from "@/components/FullSplash";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import Setup from "@/pages/Setup";
import Dashboard from "@/pages/Dashboard";
import ReviewQueue from "@/pages/ReviewQueue";
import PoisonLab from "@/pages/PoisonLab";
import LedgerPage from "@/pages/LedgerPage";
import EvaluationPage from "@/pages/EvaluationPage";
import AuditLog from "@/pages/AuditLog";
import AdminPage from "@/pages/AdminPage";

// New feature pages (added as new tabs after old tabs)
import HealthScorePage from "@/pages/HealthScorePage";
import SelfHealingPage from "@/pages/SelfHealingPage";
import KnowledgeGraphPage from "@/pages/KnowledgeGraphPage";
import RedTeamPage from "@/pages/RedTeamPage";
import ReportsPage from "@/pages/ReportsPage";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";

// Auth gate: verifies the session; routes to /setup if needs_setup is true
function RequireAuth() {
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const status = useQuery({
    queryKey: ["auth", "status"],
    queryFn: () => apiGet<NeedsSetup>("/auth/status"),
    retry: false,
    enabled: me.isError,
    refetchOnWindowFocus: false,
  });

  if (me.isPending) return <FullSplash label="Checking session" />;
  if (me.isError) {
    if (status.isPending) return <FullSplash label="Checking setup state" />;
    if (status.data?.needs_setup) return <Navigate to="/setup" replace />;
    return <Navigate to="/login" replace />;
  }
  return <AppShell />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route element={<RequireAuth />}>
          {/* --- Old Original Tabs & Routes --- */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/review" element={<ReviewQueue />} />
          <Route path="/poison-lab" element={<PoisonLab />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/eval" element={<EvaluationPage />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* --- New Feature Tabs (Added after old tabs) --- */}
          <Route path="/health" element={<HealthScorePage />} />
          <Route path="/self-healing" element={<SelfHealingPage />} />
          <Route path="/graph" element={<KnowledgeGraphPage />} />
          <Route path="/red-team" element={<RedTeamPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/documents" element={<KnowledgeBasePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
