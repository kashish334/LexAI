"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { chatApi, contractsApi } from "@/lib/api";
import { ChatMessage, ChatSession, Contract, Citation } from "@/types";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, FileText, ChevronDown, Plus, BookOpen, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";

function CitationCard({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-indigo-400 hover:bg-slate-700/50 transition-colors"
      >
        <BookOpen className="w-3 h-3" />
        <span className="flex-1 text-left truncate">{citation.document}</span>
        <span className="text-slate-500">Page {citation.page}</span>
        <ChevronDown className={clsx("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-3 pb-3 text-slate-400 italic border-t border-slate-700 pt-2 leading-relaxed">
          &ldquo;{citation.excerpt}&rdquo;
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={clsx("flex gap-3 animate-fade-up", isUser && "flex-row-reverse")}>
      <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1", isUser ? "bg-indigo-600" : "bg-slate-700")}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-slate-300" />}
      </div>
      <div className={clsx("max-w-[75%] space-y-2", isUser && "items-end flex flex-col")}>
        <div className={clsx("rounded-2xl px-5 py-4 text-sm leading-relaxed", isUser ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm")}>
          <ReactMarkdown className="prose prose-sm prose-invert max-w-none">{msg.content}</ReactMarkdown>
        </div>
        {msg.citations && msg.citations.length > 0 && (
          <div className="space-y-1.5 w-full max-w-sm">
            <p className="text-xs text-slate-500 px-1">Sources</p>
            {msg.citations.map((c, i) => <CitationCard key={i} citation={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initSession = searchParams.get("session");
  const initContract = searchParams.get("contract");

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<number | null>(initSession ? Number(initSession) : null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<number | null>(initContract ? Number(initContract) : null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.getSessions().then((r) => setSessions(r.data));
    contractsApi.list().then((r) => setContracts(r.data.filter((c: Contract) => c.status === "ready")));
  }, []);

  useEffect(() => {
    if (activeSession) {
      chatApi.getMessages(activeSession).then((r) => setMessages(r.data));
    }
  }, [activeSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    setInput("");
    setSending(true);

    const userMsg: ChatMessage = { id: Date.now(), role: "user", content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await chatApi.sendMessage({
        message: content,
        session_id: activeSession || undefined,
        contract_id: selectedContract || undefined,
      });
      if (!activeSession) {
        setActiveSession(res.data.session_id);
        chatApi.getSessions().then((r) => setSessions(r.data));
      }
      const aiMsg: ChatMessage = {
        id: res.data.message_id,
        role: "assistant",
        content: res.data.answer,
        citations: res.data.citations,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const newChat = () => {
    setActiveSession(null);
    setMessages([]);
    setSelectedContract(null);
  };

  return (
    <div className="flex h-screen">
      {/* Session sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <button onClick={newChat} className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={clsx("w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all", activeSession === s.id ? "bg-slate-700 text-slate-200" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")}
            >
              <div className="font-medium truncate">{s.title}</div>
              <div className="text-slate-500 mt-0.5">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {/* Contract selector */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <FileText className="w-4 h-4 text-slate-500" />
          <select
            value={selectedContract || ""}
            onChange={(e) => setSelectedContract(e.target.value ? Number(e.target.value) : null)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">General question (no document)</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.original_filename}</option>)}
          </select>
          {selectedContract && (
            <span className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded-lg">
              RAG Active
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2" style={{fontFamily:'Sora,sans-serif'}}>LexAI Legal Assistant</h2>
              <p className="text-slate-400 text-sm max-w-sm">Select a contract above and ask any question. I&apos;ll answer with citations from the document.</p>
              <div className="grid grid-cols-2 gap-3 mt-8 text-left max-w-lg">
                {[
                  "What are the payment terms?",
                  "Are there auto-renewal clauses?",
                  "What are the termination conditions?",
                  "Who are the liable parties?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-sm text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 px-4 py-3 rounded-xl text-left transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center">
                <Bot className="w-4 h-4 text-slate-300" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: `${i*0.15}s`}} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask a question about the contract... (Enter to send)"
              rows={1}
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[48px] max-h-36"
              style={{ fieldSizing: "content" } as any}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-2 text-center">AI may make mistakes. Always verify with a qualified attorney.</p>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <ChatContent />
      </Suspense>
    </AppLayout>
  );
}
