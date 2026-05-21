"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { contractsApi, analysisApi, chatApi } from "@/lib/api";
import { Contract, RiskFlag } from "@/types";
import {
  FileText, AlertTriangle, Shield, Calendar, Users, ChevronLeft,
  MessageSquare, TrendingDown, TrendingUp, Minus, Tag, ClipboardList
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import toast from "react-hot-toast";

function RiskGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#10b981";
  const label = score >= 70 ? "High Risk" : score >= 40 ? "Medium Risk" : "Low Risk";
  const angle = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full">
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round"/>
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(score/100)*126} 126`} opacity="0.9"/>
          <line x1="50" y1="50" x2={50+32*Math.cos((angle-90)*Math.PI/180)} y2={50+32*Math.sin((angle-90)*Math.PI/180)}
            stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="50" cy="50" r="3" fill="white"/>
        </svg>
      </div>
      <div className="text-3xl font-bold mt-1" style={{ color }}>{score}</div>
      <div className="text-sm mt-0.5" style={{ color }}>{label}</div>
    </div>
  );
}

function RiskFlagCard({ flag }: { flag: RiskFlag }) {
  const colors = {
    high: "bg-red-500/10 border-red-500/30 text-red-400",
    medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    low: "bg-slate-500/10 border-slate-500/30 text-slate-400",
  };
  const icons = { high: AlertTriangle, medium: Minus, low: Shield };
  const Icon = icons[flag.severity];
  return (
    <div className={clsx("border rounded-xl p-4", colors[flag.severity])}>
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-sm">{flag.type}</div>
          <div className="text-sm opacity-80 mt-1 leading-relaxed">{flag.description}</div>
          {flag.clause && <div className="text-xs opacity-60 mt-2 font-mono italic">&ldquo;{flag.clause.slice(0, 150)}...&rdquo;</div>}
        </div>
        <span className={clsx("ml-auto text-xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0", colors[flag.severity])}>
          {flag.severity}
        </span>
      </div>
    </div>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    contractsApi.get(Number(id))
      .then((r) => { setContract(r.data); setLoading(false); })
      .catch(() => { toast.error("Contract not found"); router.push("/contracts"); });
  }, [id]);

  const startChat = async () => {
    const res = await chatApi.sendMessage({ message: `Please give me a brief overview of this contract`, contract_id: Number(id) });
    router.push(`/chat?session=${res.data.session_id}`);
  };

  const tabs = ["overview", "risk", "clauses", "parties"];

  if (loading) return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 shimmer-bg rounded-2xl" />)}
      </div>
    </AppLayout>
  );

  if (!contract) return null;

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/contracts" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Contracts
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white" style={{fontFamily:'Sora,sans-serif'}}>{contract.original_filename}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {contract.contract_type && (
                  <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-full">
                    {contract.contract_type}
                  </span>
                )}
                <span className="text-slate-500 text-xs">{contract.page_count} pages · {contract.word_count?.toLocaleString()} words</span>
              </div>
            </div>
            <button
              onClick={startChat}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0 transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Chat with AI
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 p-1 rounded-xl mb-6 w-fit">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all", activeTab === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200")}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-up">
            {contract.summary && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-400" /> Executive Summary</h2>
                <p className="text-slate-300 leading-relaxed text-sm">{contract.summary}</p>
              </div>
            )}
            {contract.key_dates && contract.key_dates.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-400" /> Key Dates</h2>
                <div className="space-y-3">
                  {contract.key_dates.map((d, i) => (
                    <div key={i} className="flex items-start gap-3 border-l-2 border-indigo-500/40 pl-3">
                      <div>
                        <div className="text-indigo-300 text-sm font-mono">{d.date}</div>
                        <div className="text-slate-400 text-sm">{d.event}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Risk */}
        {activeTab === "risk" && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex items-center gap-8">
              {contract.risk_score !== null && <RiskGauge score={contract.risk_score} />}
              <div>
                <h2 className="text-white font-semibold mb-1">Risk Assessment</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {(contract.risk_flags?.length || 0)} risk flag(s) detected across this contract.
                </p>
              </div>
            </div>
            {contract.risk_flags && contract.risk_flags.length > 0 ? (
              <div className="space-y-3">
                {contract.risk_flags.map((flag, i) => <RiskFlagCard key={i} flag={flag} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No significant risks detected</p>
              </div>
            )}
          </div>
        )}

        {/* Clauses */}
        {activeTab === "clauses" && contract.clauses && (
          <div className="space-y-4 animate-fade-up">
            {Object.entries(contract.clauses).filter(([k, v]) => Array.isArray(v) && v.length > 0).map(([key, items]) => (
              <div key={key} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 capitalize flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  {key.replace(/_/g, " ")} Clauses
                </h3>
                <div className="space-y-2">
                  {(items as string[]).map((item, i) => (
                    <div key={i} className="text-slate-300 text-sm bg-slate-700/30 rounded-lg px-4 py-3 leading-relaxed">{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Parties */}
        {activeTab === "parties" && (
          <div className="animate-fade-up">
            {contract.parties && contract.parties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contract.parties.map((p, i) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">{p.name}</div>
                      <div className="text-slate-400 text-sm">{p.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No parties extracted</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
