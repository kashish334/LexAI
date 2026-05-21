"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { adminApi } from "@/lib/api";
import { Users, FileText, MessageSquare, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { clsx } from "clsx";

interface AdminStats {
  total_users: number;
  total_contracts: number;
  total_queries: number;
  avg_risk_score: number;
  high_risk_contracts: number;
}

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-4", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-white" style={{ fontFamily: "Sora,sans-serif" }}>{value}</div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.stats(), adminApi.users()]).then(([s, u]) => {
      setStats(s.data);
      setUsers(u.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Sora,sans-serif" }}>Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Platform analytics and user management</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[1,2,3,4,5].map(i => <div key={i} className="h-32 shimmer-bg rounded-2xl" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard icon={Users} label="Total Users" value={stats.total_users} color="bg-indigo-600" />
            <StatCard icon={FileText} label="Contracts" value={stats.total_contracts} color="bg-emerald-600" />
            <StatCard icon={MessageSquare} label="Total Queries" value={stats.total_queries} color="bg-purple-600" />
            <StatCard icon={TrendingUp} label="Avg Risk Score" value={`${stats.avg_risk_score}/100`} color="bg-amber-600" />
            <StatCard icon={AlertTriangle} label="High Risk Docs" value={stats.high_risk_contracts} color="bg-red-600" />
          </div>
        )}

        {/* Risk gauge */}
        {stats && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">Platform Risk Distribution</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Low Risk</span>
                  <span>Avg: {stats.avg_risk_score}/100</span>
                  <span>High Risk</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all"
                    style={{ width: `${stats.avg_risk_score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold">Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["ID", "Name", "Email", "Role", "Joined"].map(h => (
                    <th key={h} className="text-left text-slate-500 text-xs font-medium px-6 py-3 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-sm">#{u.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-indigo-600/30 rounded-full flex items-center justify-center text-indigo-400 text-xs font-bold">
                          {u.full_name[0]}
                        </div>
                        <span className="text-slate-200 text-sm">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={clsx("text-xs px-2 py-0.5 rounded-full border", u.is_admin ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20")}>
                        {u.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
