import { useState } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import type { ChatMessage, NlpTrace } from '../types';

interface ChatbotViewProps {
  dbOffline: boolean;
}

const QUICK_PROMPTS = [
  'Olá, tudo bem?',
  'Quais serviços vocês oferecem?',
  'Quanto custa a Troca de Tela?',
  'Qual o horário e endereço da loja?',
  'Vocês vendem capinha de celular?',
];

const INTENT_LABELS: Record<NlpTrace['intent'], string> = {
  saudacao: 'Saudação',
  catalogo_especifico: 'Consulta de Preço Específico (spaCy PhraseMatcher)',
  catalogo_geral: 'Consulta Geral do Catálogo (MySQL)',
  horario_localizacao: 'Horário e Localização',
  fallback: 'Fora do Escopo (Fallback)',
};

export function ChatbotView({ dbOffline }: ChatbotViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Olá! Sou o assistente da TechFix. Envie uma pergunta ou selecione um dos prompts de aceitação abaixo para testar o pipeline NLTK + spaCy.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [latestTrace, setLatestTrace] = useState<NlpTrace | null>(null);

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed && textToSend === '') {
      // Ainda permite testar envio vazio se o usuário clicar explicitamente via teste
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: textToSend || '(mensagem vazia)',
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: textToSend }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: 'bot',
            status: res.status,
            text: `HTTP ${res.status}: ${data.erro ?? 'Erro na requisição.'}`,
          },
        ]);
      } else {
        setLatestTrace(data.trace);
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: 'bot',
            status: res.status,
            text: data.resposta,
            trace: data.trace,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: 'Falha de comunicação com o servidor POST /chat.',
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    void sendMessage(input);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Conversa POST /chat */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg flex flex-col h-[600px]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Atendimento TechFix (POST /chat)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {dbOffline
                ? 'Atenção: simulação de queda MySQL ativa (retornará 503)'
                : 'Consultando dinamicamente os serviços cadastrados no catálogo'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMessages([
                {
                  id: 'welcome-reset',
                  role: 'bot',
                  text: 'Conversa reiniciada. Envie uma mensagem para testar o NLP.',
                },
              ]);
              setLatestTrace(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.status && msg.status >= 400
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                <p>{msg.text}</p>
                {msg.trace && (
                  <p className="mt-1.5 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                    Intenção: {INTENT_LABELS[msg.trace.intent]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Prompts rápidos da Etapa 4 */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-white flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              onClick={() => void sendMessage(prompt)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="p-4 border-t border-slate-200 bg-white flex items-center gap-2 rounded-b-lg"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem para o chatbot TechFix..."
            className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Enviar</span>
          </button>
        </form>
      </div>

      {/* Inspetor NLTK + spaCy */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Pipeline NLTK e spaCy
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualização passo a passo de limpar_texto() e PhraseMatcher(attr=&quot;LOWER&quot;)
          </p>
        </div>

        {latestTrace ? (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500">
                1. Tokenização bruta (wordpunct_tokenize)
              </p>
              <p className="mt-1.5 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded p-2.5 break-words">
                {JSON.stringify(latestTrace.rawTokens)}
              </p>
            </div>

            <div className="pb-3 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500">
                2. Artigos, preposições e pontuação removidos
              </p>
              <p className="mt-1.5 font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2.5">
                {latestTrace.removedTokens.length > 0
                  ? JSON.stringify(latestTrace.removedTokens)
                  : '[] (nenhum token removido)'}
              </p>
            </div>

            <div className="pb-3 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500">
                3. Tokens limpos (saída de limpar_texto)
              </p>
              <p className="mt-1.5 font-mono text-xs text-blue-700 bg-blue-50/60 border border-blue-200 rounded p-2.5 break-words">
                {JSON.stringify(latestTrace.cleanTokens)}
              </p>
            </div>

            <div className="pb-3 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500">
                4. Entidades reconhecidas (spaCy PhraseMatcher)
              </p>
              <p className="mt-1.5 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded p-2.5">
                {latestTrace.matchedEntities.length > 0
                  ? JSON.stringify(latestTrace.matchedEntities)
                  : '[] (nenhum serviço específico citado)'}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Intenção classificada:</span>
              <span className="font-semibold text-slate-900">
                {INTENT_LABELS[latestTrace.intent]}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
              <span>Serviços ativos no catálogo:</span>
              <span className="font-mono font-semibold text-slate-900">
                {latestTrace.dbCount}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-slate-200 rounded-md px-4">
            <p className="text-sm font-medium text-slate-700">
              Aguardando primeira mensagem
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Clique em um dos prompts ao lado para observar os tokens gerados e as entidades extraídas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
