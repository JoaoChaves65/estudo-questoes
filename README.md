# Estudo de questões (React + TypeScript)

Aplicação web para montar um ambiente de estudo de questões de múltipla escolha a partir do texto bruto de provas.  
O objetivo é transformar blocos desorganizados em questões estruturadas, estudar com feedback imediato e gerenciar o banco de questões no próprio navegador.

## Visão geral

- Frontend com `React`, `TypeScript` e `Vite`
- Estado global com `Zustand`
- Persistência local em `localStorage` (sem backend)
- Rotas partilháveis (`react-router-dom`) com `basename` alinhado ao `base` do Vite (`/` na Vercel; `/estudo-questoes/` num build de produção local/Pages sem `VERCEL`)
- Importação/exportação de backup JSON (formato **v2** com SRS e desempenho)
- Parser com diagnóstico de erros por questão
- Modo estudo com embaralhamento e modo foco

## Funcionalidades

### 1) Disciplinas

- Criar disciplinas e listá-las
- Abrir importação de questões por disciplina (rota `/importar/:disciplinaId`)
- Estudo clássico e estudo inteligente (SRS) por disciplina
- Exportar JSON de uma disciplina ou de tudo

### 2) Importação por texto bruto

- Área para colar o bloco da prova; pré-visualização das questões detectadas
- Expansão de cada item para ver alternativas e explicação
- Salvamento bloqueado se houver erros de parsing
- Diagnósticos específicos (alternativa ausente, gabarito, enunciado, etc.)

### 3) Modo estudo

- Ordem das questões embaralhada; alternativas embaralhadas com letras fixas
- Feedback imediato e contadores
- Finalização com resumo e revisão só das incorretas
- Modo foco com cabeçalho compacto (tema, voltar, sair)

### 4) Estudo inteligente (SRS)

- Filas ordenadas por prazo de revisão e limites opcionais de novas/revisões por dia
- Congelamento de cartões para pausar itens pontuais sem apagar dados
- Contagem de pendências por disciplina na página inicial  
  Dados SRS ficam na chave `estudo-questoes-srs` (ver [Persistência](#persistência)).

### 5) Desempenho

- Histórico de acertos/erros/pulos por questão para gráficos e leituras agregadas
- Persistência na chave `estudo-questoes-desempenho`

### 6) Gerenciamento de questões

- Busca, filtros, exclusão individual e em lote, exclusão de disciplina
- Detecção sugestiva de duplicidades (sem exclusão automática)

### 7) Backup JSON

- Exportar/importar arquivo validando formato
- Versão **v1**: apenas disciplinas e questões
- Versão **v2** (atual nos exports completos):

  | Campo | Conteúdo |
  | --- | --- |
  | `format` | sempre `estudo-questoes` |
  | `version` | `2` |
  | `disciplinas` | lista de disciplinas com questões |
  | `progressoInteligente` | estado SRS (`porDisciplina`, preferências por dia, intervalos…) |
  | `estatisticasDesempenho` _(opc.)_ | `porDisciplina` → por questão: `acertos`, `erros`, `puladas` |

Na importação, disciplinas são mescladas por `id`; SRS e desempenho opcionais no JSON são aplicados quando presentes.

## Desempenho (UI)

As listagens usam filtros normais no navegador. Se uma disciplina tiver um volume muito grande de questões e a interface ficar pesada, considere medir primeiro (DevTools Performance) antes de acrescentar virtualização.

## PWA / offline / atualizações

- O projeto usa `vite-plugin-pwa`: cache de assets e fallback de navegação para `index.html` quando há service worker ativo.
- Deploy no GitHub Pages também inclui **`404.html` igual ao `index.html`** após o build, para refrescos em URLs profundas **antes** de o SW estar ativo.
- Atualização de app: quando houver nova versão, pode aparecer o diálogo para recarregar e aplicar o bundle novo.

## Persistência local

Os dados ficam apenas no navegador. Chaves reais utilizadas pelo app:

| Chave | Armazém |
| --- | --- |
| `estudo-questoes-storage` | Disciplinas e questões (`useDisciplinasStore`) |
| `estudo-questoes-theme` | Tema claro/escuro |
| `estudo-questoes-srs` | Progresso SRS |
| `estudo-questoes-desempenho` | Estatísticas de estudo |

Limpar dados do site remove tudo daí; usar exportação/importação JSON para migração.

## Stack principal

- `react`, `react-dom`, `react-router-dom`
- `typescript`, `vite`, `vite-plugin-pwa`
- `zustand`, `uuid`, `lucide-react`, `recharts`, `workbox-window`

## Requisitos

- Node.js 18+ (recomendado 20+, como na CI/deploy)
- `npm`

## Como rodar localmente

```bash
npm install
npm run dev
```

Em desenvolvimento: `http://localhost:5173` (basename `/`).

## Scripts

- `npm run dev`: servidor Vite
- `npm run build`: typecheck + build de produção (gera `dist/` + `404.html`)
- `npm run preview`: validar build localmente
- `npm run test`: Vitest (`--pool=threads`)
- `npm run lint`: ESLint sobre `src/`

## Estrutura principal

```text
src/
  components/
  pages/
    HomePage.tsx
    ImportPage.tsx
    StudyPage.tsx
    SrsStudyPage.tsx
    ManageQuestionsPage.tsx
    DesempenhoPage.tsx
  store/
    useDisciplinasStore.ts
    useThemeStore.ts
    useSrsProgressStore.ts
    useDesempenhoStore.ts
  utils/
    parser.ts
    backup.ts
    srsScheduler.ts
    pluralPt.ts
    …
  types/
  App.tsx
  main.tsx
```

## Formato esperado pelo parser

Exemplo válido:

```text
1) Enunciado completo da questão.

A) Texto da alternativa A.
…
Justificativa: GABARITO: C FEEDBACK/COMENTARIO: Explicação da resposta.
```

## Deploy na Vercel (recomendado)

1. Conta em [vercel.com](https://vercel.com), **Add New Project** → importar este repositório GitHub.
2. Framework: **Vite** (detetado). Build: `npm run build`, output `dist` (padrão).
3. Em **Settings → Environment Variables**, adicionar:
   - `GEMINI_API_KEY` — chave da API Gemini (só no servidor; não usar prefixo `VITE_`).
   - Opcional: `GEMINI_MODEL` (ex.: `gemini-2.5-flash` ou `gemma-4-26b-a4b-it`; existe default no código).

Na Vercel o build define `VERCEL`, por isso o `vite.config.ts` usa **`base: '/'`** e as rotas funcionam na raiz do domínio.

Rota serverless: **`POST /api/chat`** — corpo JSON `{ "prompt": "..." }` ou `{ "messages": [{ "role": "user", "content": "..." }] }`. Resposta `{ "text": "..." }`.

Helper no cliente: `src/utils/geminiChat.ts` → `chatGemini(prompt)` (usa caminho relativo `/api/chat`).

### Testar API no computador

```bash
cp .env.example .env
# Editar .env com GEMINI_API_KEY

npx vercel dev
```

Abre o URL indicado (front + `/api/chat` no mesmo host).

### Build local como na Vercel

```bash
VERCEL=1 npm run build
```

### GitHub Pages (opcional)

O workflow **Deploy to GitHub Pages** passou a ser só **`workflow_dispatch`** (manual). Um build de produção **sem** `VERCEL` continua com `base: '/estudo-questoes/'` para artefactos compatíveis com Pages.

## Limitações atuais

- Sem login nem sincronização em nuvem
- Sugestão de duplicidades é manual/automática só na revisão pelo utilizador

---

Projeto para estudo organizado com autonomia e dados locais.
