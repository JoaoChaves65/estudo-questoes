# Estudo de Questoes (React + TypeScript)

Aplicacao web para montar um ambiente de estudo de questoes de multipla escolha a partir de texto bruto de provas.  
O foco do projeto e transformar blocos desorganizados em questoes estruturadas, estudar com feedback imediato e gerenciar o banco de questoes direto no navegador.

## Visao geral

- Frontend puro com `React`, `TypeScript` e `Vite`
- Estado global com `Zustand`
- Persistencia local com `localStorage` (sem backend)
- Importacao/exportacao de backup em JSON
- Parser com diagnostico de erros por questao
- Modo estudo com embaralhamento e modo foco

## Funcionalidades

### 1) Disciplinas

- Criar disciplinas
- Listar disciplinas cadastradas
- Acessar a tela de importacao de questoes por disciplina
- Iniciar estudo por disciplina
- Exportar JSON de uma disciplina especifica

### 2) Importacao de questoes por texto bruto

- Campo de texto para colar o bloco completo da prova
- Pre-visualizacao automatica das questoes detectadas
- Expansao de cada item da previa para ver alternativas e explicacao
- Bloqueio de salvamento quando houver erros de parsing
- Diagnosticos especificos (ex.: ausencia de alternativa A, gabarito ausente, enunciado invalido)
- Modelo de questao exibido quando a previa estiver vazia

### 3) Modo estudo

- Sessao com ordem de questoes embaralhada
- Embaralhamento do texto das alternativas mantendo letras fixas (`A`, `B`, `C`...)
- Feedback imediato ao responder
- Contadores de acertos e erros
- Finalizacao da sessao com resumo
- Revisao apenas das questoes erradas
- Modo foco com barra compacta (tema + voltar + sair do foco)

### 4) Gerenciamento de questoes

- Busca por trecho do enunciado
- Filtro por disciplina
- Exclusao individual de questao com confirmacao
- Selecao multipla e exclusao em lote
- Exclusao de disciplina inteira com confirmacao
- Exibicao de ID da questao
- Expandir/recolher para ver alternativas e explicacao
- Deteccao de possiveis duplicadas (sugestao; sem exclusao automatica)

### 5) Backup JSON

- Exportar todas as disciplinas em um arquivo
- Exportar uma disciplina especifica
- Importar backup JSON validando formato
- Mesclar com dados existentes por `id` de disciplina:
  - disciplina nova -> adicionada
  - disciplina ja existente -> atualizada

## Persistencia de dados

Os dados ficam salvos no navegador do usuario:

- disciplinas e questoes: chave `estudo-questoes-storage`
- preferencia de tema: chave `estudo-questoes-theme`

Importante:

- limpar dados do navegador remove os dados locais
- trocar de navegador/dispositivo nao leva os dados automaticamente
- para migrar dados, use exportacao/importacao JSON

## Stack e bibliotecas

- `react`
- `react-dom`
- `typescript`
- `vite`
- `zustand`
- `uuid`
- `lucide-react`

## Requisitos

- `Node.js` 18+ (recomendado)
- `npm` (ou outro gerenciador compativel)

## Como rodar localmente

```bash
npm install
npm run dev
```

App em desenvolvimento: `http://localhost:5173`

## Scripts disponiveis

- `npm run dev`: inicia servidor de desenvolvimento com Vite
- `npm run build`: executa typecheck e build de producao
- `npm run preview`: serve build local para validacao

## Estrutura principal

```text
src/
  components/
    DisciplinaCard.tsx
    Layout.tsx
    QuestionStudyCard.tsx
  pages/
    HomePage.tsx
    ImportPage.tsx
    StudyPage.tsx
    ManageQuestionsPage.tsx
  store/
    useDisciplinasStore.ts
    useThemeStore.ts
  utils/
    parser.ts
    backup.ts
    download.ts
    shuffle.ts
  types/
    index.ts
  App.tsx
  main.tsx
```

## Formato esperado pelo parser

Exemplo de bloco valido:

```text
1) Enunciado completo da questao.

A) Texto da alternativa A.
B) Texto da alternativa B.
C) Texto da alternativa C.
D) Texto da alternativa D.
E) Texto da alternativa E.

Justificativa: GABARITO: C FEEDBACK/COMENTARIO: Explicacao da resposta.
```

Observacoes:

- o parser normaliza trechos comuns de ruido (quebras de linha, blocos de nota/peso etc.)
- a deteccao considera marcadores numerados (`1)`, `2)`...)
- cada questao precisa de enunciado, alternativas validas e gabarito
- quando algo falha, o sistema retorna erro especifico na previa

## Tema (Dark/Light)

- tema padrao: `dark`
- alternancia por botao com icones de sol/lua
- persistencia no navegador

## Build de producao

```bash
npm run build
```

Saida em `dist/`.

## Deploy no GitHub Pages

Sim, o projeto pode ser hospedado no GitHub Pages por ser frontend estatico.

Passo a passo basico:

1. Gerar build:

```bash
npm run build
```

2. Publicar o conteudo da pasta `dist/` em uma branch de publicacao (ex.: `gh-pages`) ou configurar workflow para isso.

3. No repositorio do GitHub, habilitar Pages apontando para a branch/pasta publicada.

Se o projeto for servido em subcaminho (ex.: `https://usuario.github.io/nome-repo/`), configure `base` no `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/nome-repo/',
});
```

## Limitacoes atuais

- nao ha autenticacao nem sincronizacao em nuvem
- deduplicacao e apenas sugestiva (nao remove automaticamente)
- parser depende de estrutura minima de questao (numeracao, alternativas e gabarito)

## Ideias de evolucao

- filtros mais avancados no gerenciamento
- tags por assunto e historico de desempenho por tema
- importadores para outros formatos (CSV/PDF preprocessado)
- sincronizacao opcional com backend

---

Projeto criado para estudo rapido e organizado de questoes, com foco em praticidade e autonomia local.
