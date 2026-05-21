"use client";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import AppLayout from "@/components/layout/AppLayout";
import { contractsApi } from "@/lib/api";
import { Contract } from "@/types";
import { Upload, FileText, Trash2, Eye, AlertTriangle, CheckCircle, Clock, Search, Filter } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import toast from "react-hot-toast";

function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted[0]) return;
    setUploading(true);
    setProgress(0);
    try {
      await contractsApi.upload(accepted[0], setProgress);
      toast.success("Contract uploaded! Processing in background...");
      onUpload(accepted[0]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"], "text/plain": [".txt"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200",
        isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/30",
        uploading && "pointer-events-none"
      )}
    >
      <input {...getInputProps()} />
      <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors", isDragActive ? "bg-indigo-600" : "bg-slate-700")}>
        <Upload className={clsx("w-6 h-6", isDragActive ? "text-white" : "text-slate-400")} />
      </div>
      {uploading ? (
        <div>
          <p className="text-slate-300 font-medium mb-3">Uploading...</p>
          <div className="w-full max-w-xs mx-auto bg-slate-700 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-slate-500 text-sm mt-2">{progress}%</p>
        </div>
      ) : (
        <>
          <p className="text-slate-300 font-medium">{isDragActive ? "Drop to upload" : "Drag & drop your contract here"}</p>
          <p className="text-slate-500 text-sm mt-2">or click to browse · PDF, DOCX, TXT up to 50MB</p>
        </>
      )}
    </div>
  );
}

function RiskBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  if (score >= 70) return <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">High Risk · {score}</span>;
  if (score >= 40) return <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">Medium · {score}</span>;
  return <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Low Risk · {score}</span>;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchContracts = () => {
    contractsApi.list().then((r) => { setContracts(r.data); setLoading(false); });
  };

  useEffect(() => { fetchContracts(); }, []);

  // Auto-refresh processing contracts
  useEffect(() => {
    const processing = contracts.some((c) => c.status === "processing");
    if (!processing) return;
    const timer = setTimeout(fetchContracts, 5000);
    return () => clearTimeout(timer);
  }, [contracts]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this contract?")) return;
    await contractsApi.delete(id);
    setContracts((prev) => prev.filter((c) => c.id !== id));
    toast.success("Contract deleted");
  };

  const filtered = contracts.filter((c) =>
    c.original_filename.toLowerCase().includes(search.toLowerCase()) ||
    (c.contract_type || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white" style={{fontFamily:'Sora,sans-serif'}}>Contracts</h1>
          <p className="text-slate-400 mt-1">Upload and manage your legal documents</p>
        </div>

        <UploadZone onUpload={() => { setLoading(true); setTimeout(fetchContracts, 1000); }} />

        {/* Search */}
        <div className="mt-8 mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contracts..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Contract grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map((i) => <div key={i} className="h-36 shimmer-bg rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No contracts found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-150 group block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
                      <FileText className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium text-sm leading-tight max-w-[200px] truncate">{c.original_filename}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{c.contract_type || "Analyzing..."}</div>
                    </div>
                  </div>
                  <button onClick={(e) => handleDelete(c.id, e)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {c.status === "ready" ? (
                    <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 text-xs">Ready</span></>
                  ) : c.status === "processing" ? (
                    <><Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" /><span className="text-amber-400 text-xs">Processing...</span></>
                  ) : (
                    <><AlertTriangle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400 text-xs">Error</span></>
                  )}
                  <RiskBadge score={c.risk_score} />
                  <span className="text-slate-600 text-xs ml-auto">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
                {c.summary && (
                  <p className="text-slate-500 text-xs mt-3 line-clamp-2 leading-relaxed">{c.summary}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
