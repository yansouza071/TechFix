export interface Servico {
  id: number;
  nome: string;
  preco: number;
}

export interface ApiExchangeLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  status: number;
  requestBody?: unknown;
  responseBody: unknown;
}

export interface NlpTrace {
  rawTokens: string[];
  removedTokens: string[];
  cleanTokens: string[];
  matchedEntities: string[];
  intent: 'saudacao' | 'catalogo_especifico' | 'catalogo_geral' | 'horario_localizacao' | 'fallback';
  dbCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  status?: number;
  trace?: NlpTrace;
}

export interface ProjectFile {
  path: string;
  name: string;
  language: string;
  content: string;
}
