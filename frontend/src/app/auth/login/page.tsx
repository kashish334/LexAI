"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Scale, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(form);
      setAuth(res.data.user, res.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-purple-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-2xl" style={{ fontFamily: "Sora,sans-serif" }}>
              LexAI
            </span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6" style={{ fontFamily: "Sora,sans-serif" }}>
            Legal Intelligence<br />at Your Fingertips
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Upload contracts, ask questions in plain English, detect risks automatically.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[["10x", "Faster Review"], ["99%", "Accuracy"], ["50+", "Clause Types"], ["SOC2", "Compliant"]].map(([val, label]) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="text-2xl font-bold text-white" style={{ fontFamily: "Sora,sans-serif" }}>{val}</div>
              <div className="text-indigo-300 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-xl">LexAI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "Sora,sans-serif" }}>
              Welcome back
            </h2>
            <p className="text-slate-400">Sign in to continue to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  suppressHydrationWarning
                  type="email"
                  required
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  suppressHydrationWarning
                  type="password"
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <button
              suppressHydrationWarning
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-slate-500 text-sm text-center mt-8">
            No account?{" "}
            <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}