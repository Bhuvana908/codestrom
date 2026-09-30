import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Network, GitFork, ArrowRight, ShieldAlert, BookOpen,
  Filter, Layers, Info, CheckCircle2, ChevronRight, Zap
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { KnowledgeGraphResponse, GraphNode, MultiHopChain } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function KnowledgeGraphPage() {
  const [selectedChainId, setSelectedChainId] = useState<string>("chain-1");
  const [activeNodeType, setActiveNodeType] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const { data: graphData, isPending } = useQuery({
    queryKey: ["knowledge-graph"],
    queryFn: () => apiGet<KnowledgeGraphResponse>("/graph"),
  });

  const activeChain = graphData?.multi_hop_chains.find((c) => c.id === selectedChainId);

  // Position nodes onto an interactive 2D layout
  const filteredNodes = (graphData?.nodes || []).filter((n) =>
    activeNodeType === "all" ? true : n.type === activeNodeType
  );

  const getNodeColor = (type: string) => {
    switch (type) {
      case "entity":
        return { fill: "#EEF2FF", stroke: "#4F46E5", text: "#4338CA" }; // indigo
      case "policy":
        return { fill: "#ECFDF5", stroke: "#10B981", text: "#065F46" }; // emerald
      case "requirement":
        return { fill: "#EFF6FF", stroke: "#3B82F6", text: "#1E40AF" }; // blue
      case "document":
        return { fill: "#F8FAFC", stroke: "#64748B", text: "#334155" }; // slate
      case "conflict":
        return { fill: "#FEF2F2", stroke: "#EF4444", text: "#991B1B" }; // red
      default:
        return { fill: "#F1F5F9", stroke: "#94A3B8", text: "#475569" };
    }
  };

  // Fixed deterministic circular/grid layout for crisp hackathon presentation
  const getCoordinates = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI;
    const rx = 360;
    const ry = 220;
    const cx = 450;
    const cy = 270;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Knowledge Graph & Multi-Hop Detection
            </h1>
            <Badge className="bg-indigo-600 text-white">
              <Network className="mr-1 h-3 w-3" /> Relational Topology
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Traverse indirect dependencies and departmental policy hierarchies to detect multi-hop contradictions.
          </p>
        </div>

        {graphData && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="border-slate-200">
              {graphData.stats.total_nodes} Nodes
            </Badge>
            <Badge variant="outline" className="border-slate-200">
              {graphData.stats.total_edges} Relational Edges
            </Badge>
            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
              {graphData.stats.conflicts} Conflict Chains
            </Badge>
          </div>
        )}
      </div>

      {/* Multi-Hop Detection Scenarios Banner */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-950 dark:bg-indigo-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Multi-Hop Contradiction Detection Engine
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Select a multi-hop inference chain to trace path
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(graphData?.multi_hop_chains || []).map((chain) => (
            <button
              key={chain.id}
              onClick={() => setSelectedChainId(chain.id)}
              className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                selectedChainId === chain.id
                  ? "border-indigo-600 bg-white shadow-xs dark:bg-slate-900"
                  : "border-slate-200/80 bg-white/60 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {chain.hops.length}
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {chain.title}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                {chain.narrative}
              </p>
            </button>
          ))}
        </div>

        {/* Active Multi-Hop Stepper Trace */}
        {activeChain && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Multi-Hop Inference Chain: Step-by-Step Path Trace
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeChain.hops.map((hop, idx) => (
                <React.Fragment key={idx}>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {hop.label}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {hop.role}
                      </div>
                    </div>
                  </div>
                  {idx < activeChain.hops.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-indigo-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-3 rounded bg-indigo-50/50 p-2.5 text-xs text-slate-700 dark:bg-indigo-950/40 dark:text-slate-300">
              <strong className="text-indigo-900 dark:text-indigo-200">Graph Multi-Hop Analysis:</strong>{" "}
              {activeChain.narrative}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Visual Graph Canvas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main SVG Graph */}
        <div className="relative col-span-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Filter Graph By Node Layer:
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {[
                { key: "all", label: "All Layers" },
                { key: "entity", label: "Entities (Dept)" },
                { key: "policy", label: "Signed Policies" },
                { key: "requirement", label: "Requirements" },
                { key: "document", label: "Documents" },
                { key: "conflict", label: "Conflicts" },
              ].map((layer) => (
                <button
                  key={layer.key}
                  onClick={() => setActiveNodeType(layer.key)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeNodeType === layer.key
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative h-[480px] w-full overflow-hidden rounded-lg bg-slate-50/50 dark:bg-slate-950/40">
            {isPending ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : (
              <svg className="h-full w-full" viewBox="0 0 900 540">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="18"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
                  </marker>
                  <marker
                    id="arrowhead-highlight"
                    markerWidth="8"
                    markerHeight="6"
                    refX="18"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#4F46E5" />
                  </marker>
                </defs>

                {/* Edges */}
                {(graphData?.edges || []).map((edge, idx) => {
                  const sIdx = filteredNodes.findIndex((n) => n.id === edge.source);
                  const tIdx = filteredNodes.findIndex((n) => n.id === edge.target);
                  if (sIdx === -1 || tIdx === -1) return null;

                  const sCoord = getCoordinates(sIdx, filteredNodes.length);
                  const tCoord = getCoordinates(tIdx, filteredNodes.length);

                  // Check if part of active multi-hop chain
                  const isHighlighted =
                    activeChain?.hops.some((h) => h.node === edge.source) &&
                    activeChain?.hops.some((h) => h.node === edge.target);

                  return (
                    <g key={idx}>
                      <line
                        x1={sCoord.x}
                        y1={sCoord.y}
                        x2={tCoord.x}
                        y2={tCoord.y}
                        stroke={isHighlighted ? "#4F46E5" : "#CBD5E1"}
                        strokeWidth={isHighlighted ? 2.5 : 1.2}
                        strokeDasharray={isHighlighted ? "none" : "3,3"}
                        markerEnd={isHighlighted ? "url(#arrowhead-highlight)" : "url(#arrowhead)"}
                      />
                      <text
                        x={(sCoord.x + tCoord.x) / 2}
                        y={(sCoord.y + tCoord.y) / 2 - 4}
                        fill={isHighlighted ? "#4338CA" : "#94A3B8"}
                        fontSize="9"
                        fontWeight={isHighlighted ? "bold" : "normal"}
                        textAnchor="middle"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {filteredNodes.map((node, idx) => {
                  const coord = getCoordinates(idx, filteredNodes.length);
                  const colors = getNodeColor(node.type);
                  const isSelected = selectedNode?.id === node.id;
                  const isInActiveChain = activeChain?.hops.some((h) => h.node === node.id);

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${coord.x}, ${coord.y})`}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <circle
                        r={isInActiveChain ? 22 : 18}
                        fill={colors.fill}
                        stroke={isInActiveChain ? "#4F46E5" : colors.stroke}
                        strokeWidth={isInActiveChain ? 3 : isSelected ? 2.5 : 1.5}
                        className="transition-all"
                      />
                      {isInActiveChain && (
                        <circle
                          r={28}
                          fill="transparent"
                          stroke="#818CF8"
                          strokeWidth="1.5"
                          strokeDasharray="4,4"
                          className="animate-spin origin-center"
                        />
                      )}
                      <text
                        y={32}
                        fill={colors.text}
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="middle"
                        className="select-none"
                      >
                        {node.label.length > 24 ? node.label.slice(0, 22) + "…" : node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Node Inspector Sidebar */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Node Inspector
            </h3>
          </div>

          {selectedNode ? (
            <div className="mt-4 space-y-4">
              <div>
                <Badge
                  variant="outline"
                  className="capitalize font-mono text-[10px]"
                >
                  {selectedNode.type}
                </Badge>
                <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {selectedNode.label}
                </h4>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                  ID: {selectedNode.id}
                </p>
              </div>

              {/* Connected Edges */}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Direct Relationships:
                </div>
                <div className="mt-2 space-y-1.5 text-xs">
                  {(graphData?.edges || [])
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((edge, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-slate-100 bg-slate-50 p-2 text-[11px] dark:border-slate-800 dark:bg-slate-800"
                      >
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {edge.label}
                        </span>{" "}
                        →{" "}
                        <span className="text-slate-700 dark:text-slate-300">
                          {edge.source === selectedNode.id ? edge.target : edge.source}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-lg bg-indigo-50/60 p-3 text-[11px] text-slate-600 dark:bg-indigo-950/30 dark:text-slate-400">
                This node participates in multi-hop validation pipelines to prevent policy bypasses.
              </div>
            </div>
          ) : (
            <div className="mt-8 text-center text-xs text-slate-400">
              <Network className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="mt-2 font-medium">Click on any node in the canvas to inspect its relationships</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
