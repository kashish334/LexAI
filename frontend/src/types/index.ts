export interface Contract {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  contract_type: string | null;
  status: "processing" | "ready" | "error";
  page_count: number | null;
  word_count: number | null;
  summary: string | null;
  parties: Party[] | null;
  key_dates: KeyDate[] | null;
  risk_score: number | null;
  risk_flags: RiskFlag[] | null;
  clauses: ClauseMap | null;
  created_at: string;
}

export interface Party {
  name: string;
  role: string;
}

export interface KeyDate {
  date: string;
  event: string;
}

export interface RiskFlag {
  severity: "high" | "medium" | "low";
  type: string;
  description: string;
  clause?: string;
}

export interface ClauseMap {
  payment: string[];
  termination: string[];
  liability: string[];
  confidentiality: string[];
  renewal: string[];
  key_obligations: { party: string; obligation: string }[];
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface Citation {
  document: string;
  page: number;
  chunk_id: number;
  excerpt: string;
  relevance: number;
}

export interface ChatSession {
  id: number;
  title: string;
  contract_id: number | null;
  created_at: string;
}

export interface SearchResult {
  contract_id: number;
  contract_name: string;
  contract_type: string | null;
  content: string;
  page_number: number;
  relevance_score: number;
}
