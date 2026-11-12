import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

interface Servico {
  id: number;
  nome: string;
  preco: number;
}

interface NlpTrace {
  rawTokens: string[];
  removedTokens: string[];
  cleanTokens: string[];
  matchedEntities: string[];
  intent: 'saudacao' | 'catalogo_especifico' | 'catalogo_geral' | 'horario_localizacao' | 'fallback';
  dbCount: number;
}

const INITIAL_SERVICOS: Servico[] = [
  { id: 1, nome: 'Troca de Tela', preco: 350.0 },
  { id: 2, nome: 'Formatação de Notebook', preco: 120.0 },
  { id: 3, nome: 'Substituição de Bateria', preco: 220.0 },
];

let servicosStore: Servico[] = INITIAL_SERVICOS.map((item) => ({ ...item }));
let nextId = 4;
let simulateDbOffline = false;

const STOPWORDS_BASICAS = new Set(['a', 'o', 'de', 'do', 'da', 'para', '?', '!']);
const BASE_SPACY_PATTERNS = [
  'Troca de Tela',
  'Formatação de Notebook',
  'Substituição de Bateria',
];

function isPunctuationToken(token: string): boolean {
  return /^[^\p{L}\p{N}]+$/u.test(token);
}

function wordpunctTokenize(text: string): string[] {
  const matches = text.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}\s]+/gu);
  return matches ? matches : [];
}

function limparTexto(mensagem: string): {
  rawTokens: string[];
  removedTokens: string[];
  cleanTokens: string[];
} {
  const lower = mensagem.toLowerCase();
  const rawTokens = wordpunctTokenize(lower);
  const removedTokens: string[] = [];
  const cleanTokens: string[] = [];

  for (const token of rawTokens) {
    if (STOPWORDS_BASICAS.has(token) || isPunctuationToken(token)) {
      removedTokens.push(token);
    } else {
      cleanTokens.push(token);
    }
  }

  return { rawTokens, removedTokens, cleanTokens };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchPhraseEntities(mensagem: string, servicos: Servico[]): string[] {
  const candidates = Array.from(
    new Set([...BASE_SPACY_PATTERNS, ...servicos.map((s) => s.nome)])
  );
  const lowerMsg = mensagem.toLowerCase();
  const matched: string[] = [];

  for (const phrase of candidates) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(phrase.toLowerCase())}(?![\\p{L}\\p{N}])`, 'u');
    if (pattern.test(lowerMsg)) {
      if (!matched.some((m) => m.toLowerCase() === phrase.toLowerCase())) {
        matched.push(phrase);
      }
    }
  }

  return matched;
}

function responderChatbot(mensagem: string): { resposta: string; trace: NlpTrace } {
  const { rawTokens, removedTokens, cleanTokens } = limparTexto(mensagem);
  const tokenSet = new Set(cleanTokens);

  const hasAny = (words: string[]) => words.some((w) => tokenSet.has(w));

  if (hasAny(['oi', 'olá', 'ola'])) {
    return {
      resposta:
        'Olá! Bem-vindo à TechFix Assistência Técnica. Posso ajudar você a consultar nossos serviços, preços, horários ou endereço.',
      trace: {
        rawTokens,
        removedTokens,
        cleanTokens,
        matchedEntities: [],
        intent: 'saudacao',
        dbCount: servicosStore.length,
      },
    };
  }

  if (hasAny(['horário', 'horario', 'endereço', 'endereco', 'loja'])) {
    return {
      resposta:
        'A TechFix funciona de segunda a sexta, das 08h às 18h, na Av. Principal, 1000.',
      trace: {
        rawTokens,
        removedTokens,
        cleanTokens,
        matchedEntities: [],
        intent: 'horario_localizacao',
        dbCount: servicosStore.length,
      },
    };
  }

  const palavrasCatalogo = [
    'serviço',
    'servico',
    'servicos',
    'serviços',
    'preço',
    'preco',
    'preços',
    'precos',
    'valor',
    'valores',
    'quanto',
    'custa',
  ];

  if (hasAny(palavrasCatalogo)) {
    const servicos = [...servicosStore];
    const matchedEntities = matchPhraseEntities(mensagem, servicos);

    if (servicos.length === 0) {
      return {
        resposta: 'No momento não há serviços cadastrados no catálogo da TechFix.',
        trace: {
          rawTokens,
          removedTokens,
          cleanTokens,
          matchedEntities,
          intent: 'catalogo_geral',
          dbCount: 0,
        },
      };
    }

    if (matchedEntities.length > 0) {
      const matchedLower = new Set(matchedEntities.map((e) => e.toLowerCase()));
      const filtrados = servicos.filter((s) => matchedLower.has(s.nome.toLowerCase()));
      if (filtrados.length > 0) {
        const detalhes = filtrados
          .map((s) => `${s.nome}: R$ ${s.preco.toFixed(2)}`)
          .join('; ');
        return {
          resposta: `O valor encontrado no catálogo da TechFix é — ${detalhes}.`,
          trace: {
            rawTokens,
            removedTokens,
            cleanTokens,
            matchedEntities,
            intent: 'catalogo_especifico',
            dbCount: servicos.length,
          },
        };
      }
    }

    const listaFormatada = servicos
      .map((s) => `${s.nome} (R$ ${s.preco.toFixed(2)})`)
      .join('; ');
    return {
      resposta: `Atualmente oferecemos os seguintes serviços na TechFix: ${listaFormatada}.`,
      trace: {
        rawTokens,
        removedTokens,
        cleanTokens,
        matchedEntities,
        intent: 'catalogo_geral',
        dbCount: servicos.length,
      },
    };
  }

  return {
    resposta:
      'Desculpe, não consegui entender sua solicitação dentro do meu escopo. Na TechFix, posso informar sobre nossos serviços disponíveis, preços, horário de funcionamento e endereço da loja.',
    trace: {
      rawTokens,
      removedTokens,
      cleanTokens,
      matchedEntities: matchPhraseEntities(mensagem, servicosStore),
      intent: 'fallback',
      dbCount: servicosStore.length,
    },
  };
}

function validateServicoBody(body: unknown): {
  nome?: string;
  preco?: number;
  erro?: string;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { erro: 'Corpo da requisição deve ser um JSON válido.' };
  }

  const record = body as Record<string, unknown>;
  const nome = record.nome;
  const preco = record.preco;

  if (typeof nome !== 'string' || nome.trim().length === 0) {
    return { erro: "O campo 'nome' é obrigatório e deve ser uma string não vazia." };
  }

  const nomeLimpo = nome.trim();
  if (nomeLimpo.length > 100) {
    return { erro: "O campo 'nome' deve ter no máximo 100 caracteres." };
  }

  if (typeof preco !== 'number' || Number.isNaN(preco) || !Number.isFinite(preco)) {
    return { erro: "O campo 'preco' é obrigatório e deve ser um número." };
  }

  if (preco <= 0) {
    return { erro: "O campo 'preco' deve ser maior que zero." };
  }

  return { nome: nomeLimpo, preco: Number(preco.toFixed(2)) };
}

function requireDbAvailable(_req: Request, res: Response, next: NextFunction) {
  if (simulateDbOffline) {
    res.status(503).json({
      erro: 'Serviço temporariamente indisponível. Não foi possível conectar ao banco de dados.',
    });
    return;
  }
  next();
}

function detectLanguage(filePath: string): string {
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.sql')) return 'sql';
  if (filePath.endsWith('.http')) return 'http';
  if (filePath.endsWith('.txt')) return 'text';
  return 'env';
}

async function readDirRecursive(dir: string, rootDir: string): Promise<Array<{
  path: string;
  name: string;
  language: string;
  content: string;
}>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: Array<{
    path: string;
    name: string;
    language: string;
    content: string;
  }> = [];

  for (const entry of entries) {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await readDirRecursive(fullPath, rootDir);
      results.push(...nested);
    } else {
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      const content = await fs.readFile(fullPath, 'utf-8');
      results.push({
        path: relPath,
        name: entry.name,
        language: detectLanguage(relPath),
        content,
      });
    }
  }

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Handlers CRUD de Serviços (montados em /api/servicos e /servicos)
  const listServicosHandler = (req: Request, res: Response) => {
    void req;
    res.status(200).json(servicosStore);
  };

  const getServicoByIdHandler = (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(404).json({ erro: 'Serviço não encontrado.' });
      return;
    }
    const found = servicosStore.find((s) => s.id === id);
    if (!found) {
      res.status(404).json({ erro: 'Serviço não encontrado.' });
      return;
    }
    res.status(200).json(found);
  };

  const createServicoHandler = (req: Request, res: Response) => {
    const validated = validateServicoBody(req.body);
    if (validated.erro || validated.nome === undefined || validated.preco === undefined) {
      res.status(400).json({ erro: validated.erro });
      return;
    }
    const novo: Servico = {
      id: nextId++,
      nome: validated.nome,
      preco: validated.preco,
    };
    servicosStore.push(novo);
    res.status(201).json(novo);
  };

  const updateServicoHandler = (req: Request, res: Response) => {
    const validated = validateServicoBody(req.body);
    if (validated.erro || validated.nome === undefined || validated.preco === undefined) {
      res.status(400).json({ erro: validated.erro });
      return;
    }
    const id = Number(req.params.id);
    const index = servicosStore.findIndex((s) => s.id === id);
    if (index === -1) {
      res.status(404).json({ erro: 'Serviço não encontrado.' });
      return;
    }
    const atualizado: Servico = {
      id,
      nome: validated.nome,
      preco: validated.preco,
    };
    servicosStore[index] = atualizado;
    res.status(200).json(atualizado);
  };

  const deleteServicoHandler = (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const index = servicosStore.findIndex((s) => s.id === id);
    if (index === -1) {
      res.status(404).json({ erro: 'Serviço não encontrado.' });
      return;
    }
    servicosStore.splice(index, 1);
    res.status(200).json({ mensagem: 'Serviço excluído com sucesso.' });
  };

  for (const prefix of ['/servicos', '/api/servicos']) {
    app.get(prefix, requireDbAvailable, listServicosHandler);
    app.get(`${prefix}/:id`, requireDbAvailable, getServicoByIdHandler);
    app.post(prefix, requireDbAvailable, createServicoHandler);
    app.put(`${prefix}/:id`, requireDbAvailable, updateServicoHandler);
    app.delete(`${prefix}/:id`, requireDbAvailable, deleteServicoHandler);
  }

  // Chatbot routes
  app.post('/chat', requireDbAvailable, (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ erro: 'Corpo da requisição deve ser um JSON válido.' });
      return;
    }
    const mensagem = body.mensagem;
    if (typeof mensagem !== 'string' || mensagem.trim().length === 0) {
      res.status(400).json({ erro: "O campo 'mensagem' é obrigatório e não pode estar vazio." });
      return;
    }
    const result = responderChatbot(mensagem.trim());
    res.status(200).json({ resposta: result.resposta });
  });

  app.post('/api/chat', requireDbAvailable, (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ erro: 'Corpo da requisição deve ser um JSON válido.' });
      return;
    }
    const mensagem = body.mensagem;
    if (typeof mensagem !== 'string' || mensagem.trim().length === 0) {
      res.status(400).json({ erro: "O campo 'mensagem' é obrigatório e não pode estar vazio." });
      return;
    }
    const result = responderChatbot(mensagem.trim());
    res.status(200).json(result);
  });

  // Banco & Simulação 503
  app.get('/api/db-status', (_req: Request, res: Response) => {
    res.status(200).json({ offline: simulateDbOffline });
  });

  app.post('/api/simulate-db-outage', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    simulateDbOffline = Boolean(body?.offline);
    res.status(200).json({ offline: simulateDbOffline });
  });

  app.post('/api/reset-db', (_req: Request, res: Response) => {
    servicosStore = INITIAL_SERVICOS.map((item) => ({ ...item }));
    nextId = 4;
    simulateDbOffline = false;
    res.status(200).json({ servicos: servicosStore });
  });

  // Código-fonte do projeto Python chatbot_techfix/
  app.get('/api/project-files', async (_req: Request, res: Response) => {
    try {
      const targetDir = path.resolve(process.cwd(), 'chatbot_techfix');
      const files = await readDirRecursive(targetDir, targetDir);
      res.status(200).json({ files });
    } catch {
      res.status(500).json({ erro: 'Não foi possível ler os arquivos do projeto Python.' });
    }
  });

  // Vite middleware (dev) ou static dist (prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TechFix Workbench rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
