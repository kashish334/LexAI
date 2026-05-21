"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Scale, Mail, Lock, User, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", full_name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      setAuth(res.data.user, res.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "full_name", label: "Full Name", type: "text", icon: User, placeholder: "Jane Smith", autoComplete: "name" },
    { key: "email", label: "Email", type: "email", icon: Mail, placeholder: "jane@company.com", autoComplete: "email" },
    { key: "password", label: "Password", type: "password", icon: Lock, placeholder: "Min 6 characters", autoComplete: "new-password" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-2xl" style={{ fontFamily: "Sora,sans-serif" }}>
            LexAI
          </span>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2 text-center" style={{ fontFamily: "Sora,sans-serif" }}>
            Create your account
          </h2>
          <p className="text-slate-400 text-sm text-center mb-8">
            Start analyzing contracts with AI today
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {fields.map(({ key, label, type, icon: Icon, placeholder, autoComplete }) => (
              <div key={key}>
                <label className="text-slate-300 text-sm font-medium mb-2 block">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    suppressHydrationWarning
                    type={type}
                    required
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            ))}

            <button
              suppressHydrationWarning
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-slate-500 text-sm text-center mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}