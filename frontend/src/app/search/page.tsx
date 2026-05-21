"use client";
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { searchApi } from "@/lib/api";
import { SearchResult } from "@/types";
import { Search, FileText, BookOpen, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchApi.search({ query, top_k: 15 });
      setResults(res.data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const relevanceColor = (score: number) => {
    if (score > 0.8) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score > 0.6) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white" style={{fontFamily:'Sora,sans-serif'}}>Semantic Search</h1>
          <p className="text-slate-400 mt-1">Search across all your contracts using AI-powered semantic understanding</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try "unlimited liability clauses" or "auto-renewal terms"...'
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>

        {!searched && (
          <div className="mb-8">
            <p className="text-slate-500 text-sm mb-3">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {["payment terms and conditions","termination without cause","intellectual property ownership","limitation of liability","auto-renewal clauses","confidentiality obligations","governing law","indemnification"].map((s) => (
                <button key={s} onClick={() => setQuery(s)} className="text-xs text-slate-400 bg-slate-800 border border-slate-700 hover:border-indigo-500/50 hover:text-indigo-400 px-3 py-1.5 rounded-lg transition-all">{s}</button>
              ))}
            </div>
          </div>
        )}

        {loading && <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 shimmer-bg rounded-2xl" />)}</div>}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No results found for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">{results.length} results for <span className="text-slate-200 font-medium">&ldquo;{query}&rdquo;</span></p>
            {results.map((r, i) => (
              <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 hover:border-indigo-500/30 transition-all animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-200 text-sm font-medium">{r.contract_name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{r.contract_type || "Unknown"} · Page {r.page_number}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full border", relevanceColor(r.relevance_score))}>{Math.round(r.relevance_score * 100)}% match</span>
                    <Link href={`/contracts/${r.contract_id}`} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"><ExternalLink className="w-3.5 h-3.5" /></Link>
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-xl px-4 py-3">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-300 text-sm leading-relaxed line-clamp-4 italic">&ldquo;{r.content}&rdquo;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
