import { useState } from 'react';
import { Play, CheckCircle2, XCircle } from 'lucide-react';

interface TestResult {
  id: string;
  nome: string;
  method: string;
  endpoint: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  response: unknown;
}

interface TestesViewProps {
  onAfterRun: () => Promise<void>;
}

export function TestesView({ onAfterRun }: TestesViewProps) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  async function runSuite() {
    setRunning(true);
    setResults([]);
    const collected: TestResult[] = [];

    try {
      // Restaurar banco antes de iniciar a bateria limpa
      await fetch('/api/reset-db', { method: 'POST' });

      // 1. Criação: POST /servicos {"nome": "Limpeza Interna", "preco": 90.00} -> 201
      const createRes = await fetch('/servicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Limpeza Interna', preco: 90.0 }),
      });
      const createBody = await createRes.json();
      const createdId = createBody?.id ?? 4;
      collected.push({
        id: 't1',
        nome: '1. Criação de serviço (Limpeza Interna)',
        method: 'POST',
        endpoint: '/servicos',
        expectedStatus: 201,
        actualStatus: createRes.status,
        passed: createRes.status === 201,
        response: createBody,
      });

      // 2a. Validação: preço negativo -> 400
      const negRes = await fetch('/servicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Troca de Teclado', preco: -50.0 }),
      });
      const negBody = await negRes.json();
      collected.push({
        id: 't2a',
        nome: '2a. Validação: preço negativo rejeitado',
        method: 'POST',
        endpoint: '/servicos',
        expectedStatus: 400,
        actualStatus: negRes.status,
        passed: negRes.status === 400,
        response: negBody,
      });

      // 2b. Validação: nome em branco -> 400
      const blankRes = await fetch('/servicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: '   ', preco: 120.0 }),
      });
      const blankBody = await blankRes.json();
      collected.push({
        id: 't2b',
        nome: '2b. Validação: nome em branco rejeitado',
        method: 'POST',
        endpoint: '/servicos',
        expectedStatus: 400,
        actualStatus: blankRes.status,
        passed: blankRes.status === 400,
        response: blankBody,
      });

      // 4b (antes de excluir Limpeza Interna): Chatbot lista dinamicamente o serviço novo!
      const chatListRes = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: 'Quais serviços vocês oferecem?' }),
      });
      const chatListBody = await chatListRes.json();
      const includesNewService =
        typeof chatListBody?.resposta === 'string' &&
        chatListBody.resposta.includes('Limpeza Interna');
      collected.push({
        id: 't4-dinamico',
        nome: '4a. Chatbot reflete novo serviço criado (Limpeza Interna)',
        method: 'POST',
        endpoint: '/chat',
        expectedStatus: 200,
        actualStatus: chatListRes.status,
        passed: chatListRes.status === 200 && includesNewService,
        response: chatListBody,
      });

      // 3a. Atualização: PUT /servicos/:id -> 200
      const putRes = await fetch(`/servicos/${createdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Limpeza Interna Completa', preco: 110.0 }),
      });
      const putBody = await putRes.json();
      collected.push({
        id: 't3a',
        nome: `3a. Atualização do serviço #${createdId}`,
        method: 'PUT',
        endpoint: `/servicos/${createdId}`,
        expectedStatus: 200,
        actualStatus: putRes.status,
        passed: putRes.status === 200,
        response: putBody,
      });

      // 3b. Exclusão: DELETE /servicos/:id -> 200
      const delRes = await fetch(`/servicos/${createdId}`, { method: 'DELETE' });
      const delBody = await delRes.json();
      collected.push({
        id: 't3b',
        nome: `3b. Exclusão do serviço #${createdId}`,
        method: 'DELETE',
        endpoint: `/servicos/${createdId}`,
        expectedStatus: 200,
        actualStatus: delRes.status,
        passed: delRes.status === 200,
        response: delBody,
      });

      // 3c. Confirmação 404: GET /servicos/:id após DELETE -> 404
      const getDeletedRes = await fetch(`/servicos/${createdId}`);
      const getDeletedBody = await getDeletedRes.json();
      collected.push({
        id: 't3c',
        nome: `3c. Consulta pós-exclusão retorna 404 (#${createdId})`,
        method: 'GET',
        endpoint: `/servicos/${createdId}`,
        expectedStatus: 404,
        actualStatus: getDeletedRes.status,
        passed: getDeletedRes.status === 404,
        response: getDeletedBody,
      });

      // 4. Demais testes do Chatbot
      const chatPrompts = [
        { id: 't4-oi', label: '4b. Chatbot Saudação', msg: 'Olá, tudo bem?' },
        { id: 't4-tela', label: '4c. Chatbot spaCy (Troca de Tela)', msg: 'Quanto custa a Troca de Tela?' },
        { id: 't4-fallback', label: '4d. Chatbot Fallback (fora do escopo)', msg: 'Vocês vendem capinha de celular?' },
      ];

      for (const item of chatPrompts) {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensagem: item.msg }),
        });
        const body = await res.json();
        collected.push({
          id: item.id,
          nome: item.label,
          method: 'POST',
          endpoint: '/chat',
          expectedStatus: 200,
          actualStatus: res.status,
          passed: res.status === 200 && Boolean(body?.resposta),
          response: body,
        });
      }

      setResults(collected);
      await onAfterRun();
    } finally {
      setRunning(false);
    }
  }

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Bateria de Testes de Aceitação (Etapa 4 — testes.http)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Executa todos os cenários de criação (201), validação (400), atualização/exclusão (200/404) e chatbot dinâmico contra os endpoints reais.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void runSuite()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Play className="w-4 h-4" />
          <span>{running ? 'Executando...' : 'Executar Bateria Completa'}</span>
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              Resultados da execução
            </span>
            <span className="text-xs font-semibold tabular-nums text-slate-900">
              {passedCount} / {results.length} aprovados
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {results.map((item) => (
              <div key={item.id} className="p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {item.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-900">
                      {item.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-600">
                    <span>
                      {item.method} {item.endpoint}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span
                      className={
                        item.passed ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'
                      }
                    >
                      HTTP {item.actualStatus} (esperado {item.expectedStatus})
                    </span>
                  </div>
                </div>
                <pre className="p-3 rounded bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto">
                  {JSON.stringify(item.response, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
