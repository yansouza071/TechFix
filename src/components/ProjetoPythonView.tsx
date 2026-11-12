import { useEffect, useState } from 'react';
import { Copy, Check, FileCode2 } from 'lucide-react';
import type { ProjectFile } from '../types';

export function ProjetoPythonView() {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('app.py');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/project-files')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const list: ProjectFile[] = data.files ?? [];
        setFiles(list);
        if (list.length > 0 && !list.some((f) => f.path === 'app.py')) {
          setSelectedPath(list[0].path);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentFile = files.find((f) => f.path === selectedPath) ?? files[0];

  async function handleCopy() {
    if (!currentFile) return;
    await navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6">
      {/* Guia rápido de execução local */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">
          Execução Local em Python + MySQL Workbench
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Todos os arquivos abaixo já foram criados na pasta chatbot_techfix/ pronta para entrega e execução local.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="font-semibold text-slate-900">01. Banco MySQL</p>
            <p className="mt-1 text-slate-600">
              Execute <code className="font-mono text-slate-900">schema.sql</code> no MySQL Workbench para criar <code className="font-mono text-slate-900">techfix_db</code>.
            </p>
          </div>
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="font-semibold text-slate-900">02. Credenciais .env</p>
            <p className="mt-1 text-slate-600">
              Ajuste <code className="font-mono text-slate-900">DB_USER</code> e <code className="font-mono text-slate-900">DB_PASSWORD</code> no arquivo <code className="font-mono text-slate-900">.env</code>.
            </p>
          </div>
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="font-semibold text-slate-900">03. Dependências</p>
            <p className="mt-1 text-slate-600">
              Rode <code className="font-mono text-slate-900">pip install -r requirements.txt</code> no seu venv Python.
            </p>
          </div>
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="font-semibold text-slate-900">04. Iniciar Flask</p>
            <p className="mt-1 text-slate-600">
              Execute <code className="font-mono text-slate-900">python app.py</code> e valide os requests em <code className="font-mono text-slate-900">testes.http</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Explorador de código-fonte */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-lg overflow-hidden min-h-[540px]">
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70 p-3">
          <p className="px-2.5 py-2 text-xs font-semibold text-slate-500">
            chatbot_techfix/
          </p>
          {loading ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-7 bg-slate-200 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {files.map((file) => {
                const active = file.path === currentFile?.path;
                return (
                  <li key={file.path}>
                    <button
                      type="button"
                      onClick={() => setSelectedPath(file.path)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-mono rounded transition-colors ${
                        active
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-slate-700 hover:bg-slate-200/60'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
            <span className="text-xs font-mono font-medium text-slate-800 truncate">
              chatbot_techfix/{currentFile?.path ?? ''}
            </span>
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!currentFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar arquivo</span>
                </>
              )}
            </button>
          </div>
          <pre className="flex-1 p-5 bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-auto max-h-[540px]">
            <code>{currentFile?.content ?? ''}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
