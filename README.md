# Estudo de questões (React + TypeScript)

Aplicação web para montar um ambiente de estudo de questões de múltipla escolha a partir do texto bruto de provas.  
O objetivo é transformar blocos desorganizados em questões estruturadas, estudar com feedback imediato e gerenciar o banco de questões no próprio navegador.

## Visão geral

- Frontend com `React`, `TypeScript` e `Vite`
- Estado global com `Zustand`
- Persistência local em `localStorage` para disciplinas, SRS e desempenho; **PostgreSQL na Vercel** para utilizadores/sessões e histórico de IA quando há conta (`DATABASE_URL` / `POSTGRES_URL`)
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
- Rotas **`/login`** e **`/registo`** opcionais: com sessão, o histórico do **`/ia`** sincroniza em **PostgreSQL** (Vercel Postgres / Neon).

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
  Dados SRS ficam na chave `estudo-questoes-srs` (ver [Persistência](#persistência-local-e-conta-vercel-postgres)).

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

## Persistência local e conta (Vercel Postgres)

| Dado | Onde fica |
| --- | --- |
| Tema UI | `localStorage` (este dispositivo) |
| Biblioteca (**disciplinas, questões, SRS, desempenho**) com **sessão** | **PostgreSQL** + cópia em `localStorage` no browser (**sincronizada** ao iniciar sessão após `/api/auth/me`) |
| Biblioteca sem login | só `localStorage` |
| Login / sessão | Cookie **`httpOnly`** definido pela API (`/api/auth/*`); não fica JWT em `localStorage` por defeito |
| Histórico do chat IA (`/ia`) **com conta** | **PostgreSQL** (tabela de conversas) |
| Preferências só de UI do chat (modelo, tamanho da resposta) | `localStorage` — **cache local** rápido |

**Regra:** com sessão iniciada, o cliente faz **`GET /api/study-library`**: se na nuvem estiver vazio e o local tiver dados, faz **`PUT`**; se a nuvem tiver dados e o local estiver vazio, **substitui o local**; se **ambos** tiverem dados, **funde** e grava (`PUT`): na mesma `disciplina.id`/`questão.id`, o conteúdo da nuvem prevalece; SRS combina maps (servidor sobrescreve mesmas chaves); desempenho **soma** totais como no import JSON.

Ao **Importar JSON** com sessão iniciada, o resultado é também enviado com **`PUT /api/study-library`** logo após atualizar os stores locais.

**Payload:** backups muito grandes podem falhar no `PUT` (limite típico ~4 MB das funções serverless); prefira vários ficheiros menores ou use `db:studio`/Neon para casos extremos.

**Segunda fase (opcional — Fase C):** pode acrescentar-se um fluxo para **importar rascunhos** já existentes só no navegador (ex.: mensagens IA antes do registo); não confundir com a biblioteca de disciplinas já sincronizada.

Limpar dados do site apaga só o que o browser guardou; dados em Postgres mantêm‑se até apagar conta ou usar as APIs aplicáveis.


## Persistência local (referência rápida)

| Chave local | Armazém |
| --- | --- |
| `estudo-questoes-storage` | Disciplinas e questões (`useDisciplinasStore`) |
| `estudo-questoes-theme` | Tema claro/escuro |
| `estudo-questoes-srs` | Progresso SRS |
| `estudo-questoes-desempenho` | Estatísticas de estudo |

Limpar dados do site remove só as chaves do browser listadas aqui em cima e as do chat Gemini em `localStorage`; use exportação/importação JSON para disciplinas ou as APIs/auth para dados em nuvem.

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
- `npm run lint`: ESLint sobre `src/`, `api/` e `shared/`
- `npm run db:generate`: gera SQL em `drizzle/` a partir do schema (`drizzle-kit generate`)
- `npm run db:push`: envia schema para Neon/Postgres (requer `.env`; `drizzle-kit push`)
- `npm run db:studio`: Drizzle Studio (opcional)

Após configurar Postgres, aplique migrações (por exemplo **`npm run db:push`** com `DATABASE_URL` ou use o SQL em `drizzle/`) antes de registar utilizadores na app.

## Estrutura principal

```text
api/
  auth/            # register, login, logout, me
  chat.ts
  conversation.ts
  study-library.ts
shared/
  db/              # schema Drizzle + client Neon
  studyLibraryValidate.ts
drizzle/           # migrações SQL geradas
src/
  components/
  contexts/
    AuthContext.tsx
  pages/
    HomePage.tsx
    ImportPage.tsx
    StudyPage.tsx
    SrsStudyPage.tsx
    ManageQuestionsPage.tsx
    DesempenhoPage.tsx
    IaTestPage.tsx
    LoginPage.tsx
    RegisterPage.tsx
  store/
    useDisciplinasStore.ts
    useThemeStore.ts
    useSrsProgressStore.ts
    useDesempenhoStore.ts
  utils/
    parser.ts
    backup.ts
    geminiChat.ts
    studyLibrarySync.ts
    studyLibraryApi.ts
    studyLibraryMerge.ts
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
   - **`DATABASE_URL`** (ou **`POSTGRES_URL`**) da instância Vercel Postgres / Neon — obrigatório para **registo/login**, **`/api/conversation`** e **`/api/study-library`**.
   - `GEMINI_API_KEY` — chave da API Gemini (só no servidor; não usar prefixo `VITE_`).
   - Opcional: `GEMINI_MODEL` (ex.: `gemini-2.5-flash` ou `gemma-4-26b-a4b-it`; existe default no código).

Primeiro deploy com Postgres: gere/aplique migrações (ver [Scripts](#scripts)) até incluir **`study_disciplines`**, **`study_questions`**, **`user_srs_progress`** e **`user_desempenho`** (pastas `drizzle/*.sql`).

Na Vercel o build define `VERCEL`, por isso o `vite.config.ts` usa **`base: '/'`** e as rotas funcionam na raiz do domínio.

Rota serverless: **`POST /api/chat`** — corpo JSON `{ "prompt": "..." }` ou `{ "messages": [{ "role": "user", "content": "..." }] }`. Resposta `{ "text": "..." }`.

- **`GET /api/study-library`**, **`PUT /api/study-library`** — biblioteca quando autenticado (`PUT`: `{ disciplinas, progressoInteligente?, estatisticasDesempenho? }`, validação em [`shared/studyLibraryValidate.ts`](shared/studyLibraryValidate.ts)).

Helper no cliente da biblioteca: `src/utils/studyLibrarySync.ts`.

- **`POST /api/auth/register`** / **`POST /api/auth/login`** — corpo `{ "email", "password" }`; definem cookie de sessão (`Set-Cookie`).
- **`POST /api/auth/logout`**, **`GET /api/auth/me`** — estado da sessão.
- **`GET/POST/DELETE /api/conversation`** — histórico do chat quando autenticado (`POST`: `{ append: [...] }`).

Helper no cliente: `src/utils/geminiChat.ts` → `chatGemini(...)` (`credentials: 'include'` junto ao cookie).

### Testar API no computador

```bash
cp .env.example .env
# Editar .env: GEMINI_API_KEY e DATABASE_URL (ou POSTGRES_URL)

npm run db:push
# ou aplique drizzle/0000_init_auth_chat.sql no painel Neon

npx vercel dev
```

Abre o URL indicado (front + `/api/*` no mesmo host; cookies válidos apenas no mesmo origin).

### Build local como na Vercel

```bash
VERCEL=1 npm run build
```

### GitHub Pages (opcional)

O workflow **Deploy to GitHub Pages** passou a ser só **`workflow_dispatch`** (manual). Um build de produção **sem** `VERCEL` continua com `base: '/estudo-questoes/'` para artefactos compatíveis com Pages.

## Limitações atuais

- **Sem sync em tempo real** entre abas ou dispositivos: os dados atualizados num aparelho só aparecem noutro na **próxima** abertura com sessão iniciada (ou após novo `PUT`/`import`).
- Sugestão de duplicidades é manual/automática só na revisão pelo utilizador.
- **Fase C** (opcional): importação explícita de rascunho local da IA para Postgres sem passar pela UI — não aplicado.

---

Projeto para estudo organizado com autonomia; conta opcional sincroniza **biblioteca** e **histórico IA** na base Postgres (Neon/Vercel).
