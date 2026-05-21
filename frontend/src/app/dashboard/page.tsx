"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { contractsApi } from "@/lib/api";
import { Contract } from "@/types";
import { useAuthStore } from "@/store/auth";
import { FileText, AlertTriangle, CheckCircle, Clock, TrendingUp, Upload, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-4", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-white" style={{fontFamily:'Sora,sans-serif'}}>{value}</div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-7 text-right">{score}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    contractsApi.list().then((r) => { setContracts(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const ready = contracts.filter((c) => c.status === "ready");
  const processing = contracts.filter((c) => c.status === "processing");
  const highRisk = ready.filter((c) => (c.risk_score || 0) >= 70);
  const avgRisk = ready.length ? Math.round(ready.reduce((a, c) => a + (c.risk_score || 0), 0) / ready.length) : 0;

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white" style={{fontFamily:'Sora,sans-serif'}}>
            Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1">Here's your contract intelligence overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={FileText} label="Total Contracts" value={contracts.length} color="bg-indigo-600" />
          <StatCard icon={CheckCircle} label="Ready to Query" value={ready.length} color="bg-emerald-600" />
          <StatCard icon={AlertTriangle} label="High Risk" value={highRisk.length} sub="score ≥ 70" color="bg-red-600" />
          <StatCard icon={TrendingUp} label="Avg Risk Score" value={`${avgRisk}/100`} color="bg-amber-600" />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { href: "/contracts", icon: Upload, label: "Upload Contract", desc: "Add PDF or DOCX", color: "from-indigo-600 to-indigo-700" },
            { href: "/chat", icon: MessageSquare, label: "AI Chat", desc: "Ask contract questions", color: "from-purple-600 to-purple-700" },
            { href: "/search", icon: Search, label: "Semantic Search", desc: "Search across all docs", color: "from-cyan-600 to-cyan-700" },
          ].map(({ href, icon: Icon, label, desc, color }) => (
            <Link
              key={href}
              href={href}
              className={clsx("bg-gradient-to-br rounded-2xl p-5 text-white hover:scale-[1.02] transition-transform duration-150 group", color)}
            >
              <Icon className="w-6 h-6 mb-3 opacity-90" />
              <div className="font-semibold">{label}</div>
              <div className="text-white/70 text-sm mt-0.5">{desc}</div>
            </Link>
          ))}
        </div>

        {/* Recent contracts */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-white font-semibold">Recent Contracts</h2>
            <Link href="/contracts" className="text-indigo-400 text-sm hover:text-indigo-300">View all →</Link>
          </div>
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 shimmer-bg rounded-xl" />
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No contracts yet.</p>
              <Link href="/contracts" className="text-indigo-400 text-sm hover:underline mt-2 inline-block">Upload your first contract →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {contracts.slice(0, 8).map((c) => (
                <Link
                  key={c.id}
                  href={`/contracts/${c.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-sm font-medium truncate">{c.original_filename}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {c.contract_type || "Unknown type"} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    {c.status === "ready" && c.risk_score !== null ? (
                      <RiskBar score={c.risk_score} />
                    ) : c.status === "processing" ? (
                      <span className="text-amber-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Processing
                      </span>
                    ) : c.status === "error" ? (
                      <span className="text-red-400 text-xs">Error</span>
                    ) : null}
                  </div>
                  <div className={clsx("text-xs px-2 py-1 rounded-full border", {
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20": c.status === "ready",
                    "bg-amber-500/10 text-amber-400 border-amber-500/20": c.status === "processing",
                    "bg-red-500/10 text-red-400 border-red-500/20": c.status === "error",
                  })}>
                    {c.status}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
