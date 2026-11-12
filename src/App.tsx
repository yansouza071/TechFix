import { useCallback, useEffect, useState } from 'react';
import {
  Wrench,
  MessageSquare,
  FlaskConical,
  FolderCode,
  RotateCcw,
  Database,
  Menu,
  X,
} from 'lucide-react';
import { CatalogoView } from './components/CatalogoView';
import { ChatbotView } from './components/ChatbotView';
import { TestesView } from './components/TestesView';
import { ProjetoPythonView } from './components/ProjetoPythonView';
import type { ApiExchangeLog, Servico } from './types';

type TabKey = 'catalogo' | 'chatbot' | 'testes' | 'projeto';

const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: typeof Wrench }> = [
  { key: 'catalogo', label: 'Catálogo e CRUD', icon: Wrench },
  { key: 'chatbot', label: 'Chatbot NLP', icon: MessageSquare },
  { key: 'testes', label: 'Testes de Aceitação', icon: FlaskConical },
  { key: 'projeto', label: 'Código Python', icon: FolderCode },
];

const TAB_TITLES: Record<TabKey, string> = {
  catalogo: 'Catálogo de Serviços (/servicos)',
  chatbot: 'Chatbot com NLTK e spaCy (/chat)',
  testes: 'Testes de Aceitação (testes.http)',
  projeto: 'Projeto Python (chatbot_techfix/)',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('catalogo');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbOffline, setDbOffline] = useState(false);
  const [lastLog, setLastLog] = useState<ApiExchangeLog | null>(null);

  const logExchange = useCallback(
    (
      method: ApiExchangeLog['method'],
      endpoint: string,
      status: number,
      responseBody: unknown,
      requestBody?: unknown
    ) => {
      setLastLog({
        id: `${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        method,
        endpoint,
        status,
        requestBody,
        responseBody,
      });
    },
    []
  );

  const fetchServicos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/servicos');
      const data = await res.json();
      logExchange('GET', '/servicos', res.status, data);
      if (res.ok && Array.isArray(data)) {
        setServicos(data);
      }
    } finally {
      setLoading(false);
    }
  }, [logExchange]);

  useEffect(() => {
    void fetchServicos();
    fetch('/api/db-status')
      .then((res) => res.json())
      .then((data) => setDbOffline(Boolean(data.offline)))
      .catch(() => {});
  }, [fetchServicos]);

  async function handleCreate(nome: string, preco: number) {
    const payload = { nome, preco };
    const res = await fetch('/api/servicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    logExchange('POST', '/servicos', res.status, data, payload);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${data.erro ?? 'Dados inválidos.'}` };
    }
    await fetchServicos();
    return { ok: true };
  }

  async function handleUpdate(id: number, nome: string, preco: number) {
    const payload = { nome, preco };
    const res = await fetch(`/api/servicos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    logExchange('PUT', `/servicos/${id}`, res.status, data, payload);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${data.erro ?? 'Erro ao atualizar.'}` };
    }
    await fetchServicos();
    return { ok: true };
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/servicos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    logExchange('DELETE', `/servicos/${id}`, res.status, data);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${data.erro ?? 'Erro ao excluir.'}` };
    }
    await fetchServicos();
    return { ok: true };
  }

  async function handleInspectById(id: number) {
    const res = await fetch(`/api/servicos/${id}`);
    const data = await res.json();
    logExchange('GET', `/servicos/${id}`, res.status, data);
  }

  async function handleResetDb() {
    const res = await fetch('/api/reset-db', { method: 'POST' });
    const data = await res.json();
    setDbOffline(false);
    if (Array.isArray(data.servicos)) {
      setServicos(data.servicos);
      logExchange('GET', '/servicos', 200, data.servicos);
    }
  }

  async function handleToggleDbOutage() {
    const nextState = !dbOffline;
    const res = await fetch('/api/simulate-db-outage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offline: nextState }),
    });
    const data = await res.json();
    setDbOffline(Boolean(data.offline));
    await fetchServicos();
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            TechFix
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Simular falha MySQL (503)</span>
          </div>
          <button
            type="button"
            onClick={() => void handleToggleDbOutage()}
            className={`w-full px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
              dbOffline
                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {dbOffline ? 'Restaurar Conexão (200)' : 'Simular Queda (503)'}
          </button>
        </div>
      </aside>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-full bg-white h-full flex flex-col border-r border-slate-200 z-50">
            <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-bold text-slate-900">TechFix</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => void handleToggleDbOutage()}
                className={`w-full px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                  dbOffline
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {dbOffline ? 'Restaurar Conexão (200)' : 'Simular Queda MySQL (503)'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-4 sm:px-8 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
              aria-label="Abrir navegação"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">TechFix</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 truncate">
                {TAB_TITLES[activeTab]}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleResetDb()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Seed</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'catalogo' && (
            <CatalogoView
              servicos={servicos}
              loading={loading}
              dbOffline={dbOffline}
              lastLog={lastLog}
              onRefresh={fetchServicos}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onInspectById={handleInspectById}
            />
          )}
          {activeTab === 'chatbot' && <ChatbotView dbOffline={dbOffline} />}
          {activeTab === 'testes' && <TestesView onAfterRun={fetchServicos} />}
          {activeTab === 'projeto' && <ProjetoPythonView />}
        </main>
      </div>
    </div>
  );
}
