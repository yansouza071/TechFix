import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, Check, AlertCircle } from 'lucide-react';
import type { ApiExchangeLog, Servico } from '../types';

interface CatalogoViewProps {
  servicos: Servico[];
  loading: boolean;
  dbOffline: boolean;
  lastLog: ApiExchangeLog | null;
  onRefresh: () => Promise<void>;
  onCreate: (nome: string, preco: number) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (id: number, nome: string, preco: number) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: number) => Promise<{ ok: boolean; error?: string }>;
  onInspectById: (id: number) => Promise<void>;
}

export function CatalogoView({
  servicos,
  loading,
  dbOffline,
  lastLog,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  onInspectById,
}: CatalogoViewProps) {
  const [busca, setBusca] = useState('');
  const [nomeInput, setNomeInput] = useState('');
  const [precoInput, setPrecoInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [lookupId, setLookupId] = useState('99');

  const filtrados = servicos.filter((s) =>
    s.nome.toLowerCase().includes(busca.trim().toLowerCase())
  );

  const precoMedio =
    servicos.length > 0
      ? servicos.reduce((acc, item) => acc + item.preco, 0) / servicos.length
      : 0;

  async function handleSubmitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const parsedPreco = Number(precoInput);
    const result = await onCreate(nomeInput, Number.isNaN(parsedPreco) ? 0 : parsedPreco);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error ?? 'Erro ao cadastrar serviço.');
      return;
    }
    setNomeInput('');
    setPrecoInput('');
  }

  function startEdit(servico: Servico) {
    setEditingId(servico.id);
    setEditNome(servico.nome);
    setEditPreco(String(servico.preco));
    setEditError(null);
  }

  async function handleSaveEdit(id: number) {
    setEditError(null);
    const parsedPreco = Number(editPreco);
    const result = await onUpdate(id, editNome, Number.isNaN(parsedPreco) ? 0 : parsedPreco);
    if (!result.ok) {
      setEditError(result.error ?? 'Erro ao atualizar serviço.');
      return;
    }
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Resumo enxuto sem cartões aninhados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Serviços cadastrados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
            {servicos.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Ticket médio</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
            R$ {precoMedio.toFixed(2)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Estado da conexão MySQL</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {dbOffline ? (
              <span className="text-red-600">Indisponível (Simulação 503)</span>
            ) : (
              <span className="text-emerald-700">Operacional (techfix_db)</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna principal: Tabela CRUD /servicos */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Catálogo de Serviços
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                GET, PUT e DELETE sincronizados com a tabela servicos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Filtrar serviço..."
                  className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 w-48"
                />
              </div>
              <button
                type="button"
                onClick={() => void onRefresh()}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Atualizar
              </button>
            </div>
          </div>

          {editError && (
            <div className="mx-5 mt-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          {loading ? (
            <div className="p-5 space-y-2.5">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                Nenhum serviço encontrado
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre um novo serviço ao lado ou limpe o filtro de busca.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-5 w-16">ID</th>
                    <th className="py-2.5 px-4">Nome do Serviço</th>
                    <th className="py-2.5 px-4 text-right w-36">Preço (R$)</th>
                    <th className="py-2.5 px-5 text-right w-32">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtrados.map((servico) => {
                    const isEditing = editingId === servico.id;
                    return (
                      <tr key={servico.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-5 font-mono text-xs text-slate-500 tabular-nums">
                          #{servico.id}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editNome}
                              onChange={(e) => setEditNome(e.target.value)}
                              className="w-full px-2.5 py-1 text-sm border border-blue-500 rounded bg-white focus:outline-none"
                              aria-label="Editar nome do serviço"
                            />
                          ) : (
                            servico.nome
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-800 tabular-nums">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editPreco}
                              onChange={(e) => setEditPreco(e.target.value)}
                              className="w-28 ml-auto px-2.5 py-1 text-sm text-right border border-blue-500 rounded bg-white focus:outline-none"
                              aria-label="Editar preço do serviço"
                            />
                          ) : (
                            `R$ ${servico.preco.toFixed(2)}`
                          )}
                        </td>
                        <td className="py-2.5 px-5 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit(servico.id)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                title="Salvar"
                                aria-label="Salvar alteração"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditError(null);
                                }}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                                title="Cancelar"
                                aria-label="Cancelar edição"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(servico)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Editar serviço"
                                aria-label={`Editar ${servico.nome}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void onDelete(servico.id)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Excluir serviço"
                                aria-label={`Excluir ${servico.nome}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Consulta rápida GET /servicos/:id para validar 200 e 404 */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-600">
              Testar busca direta por ID (GET /servicos/:id)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="w-20 px-2.5 py-1 text-xs font-mono border border-slate-200 rounded bg-white text-slate-900"
                aria-label="ID para consulta"
              />
              <button
                type="button"
                onClick={() => void onInspectById(Number(lookupId))}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Consultar ID
              </button>
            </div>
          </div>
        </div>

        {/* Coluna lateral: Formulário POST /servicos + Inspetor HTTP */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-slate-900">
              Cadastrar Serviço
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Valida nome (até 100 chars) e preço maior que zero via POST /servicos
            </p>

            <form onSubmit={handleSubmitCreate} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome do serviço
                </label>
                <input
                  type="text"
                  value={nomeInput}
                  onChange={(e) => setNomeInput(e.target.value)}
                  placeholder="Ex: Limpeza Interna"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={precoInput}
                  onChange={(e) => setPrecoInput(e.target.value)}
                  placeholder="Ex: 90.00"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              {formError && (
                <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? 'Enviando...' : 'Adicionar Serviço'}</span>
              </button>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNomeInput('Limpeza Interna');
                    setPrecoInput('90.00');
                    setFormError(null);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Preencher válido
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setNomeInput('Troca de Teclado');
                    setPrecoInput('-50');
                    setFormError(null);
                  }}
                  className="text-xs text-slate-600 hover:underline"
                >
                  Testar preço negativo (400)
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Última Resposta HTTP
              </h3>
              {lastLog && (
                <span
                  className={`text-xs font-mono font-semibold tabular-nums ${
                    lastLog.status >= 500
                      ? 'text-red-600'
                      : lastLog.status >= 400
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                  }`}
                >
                  {lastLog.status}
                </span>
              )}
            </div>

            {lastLog ? (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-mono text-slate-600">
                  {lastLog.method} {lastLog.endpoint} · {lastLog.timestamp}
                </div>
                <pre className="p-3 rounded-md bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto max-h-56">
                  {JSON.stringify(lastLog.responseBody, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Execute qualquer operação CRUD para inspecionar o JSON retornado pela API.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
