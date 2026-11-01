# CorrigeAÍ

Aplicação web para professores aplicarem provas de múltipla escolha: o professor monta o gabarito, a turma responde com um código de 5 letras e a correção é automática, com acompanhamento das entregas em tempo real.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · TanStack Query · Supabase (Postgres, Auth, Realtime).

## Testando sem Supabase (modo demonstração)

```bash
npm install
npm run dev:mock
```

Abre em http://localhost:5173 com um backend falso que guarda tudo no navegador (localStorage). Professor de exemplo: **professor@demo.com** / **demo1234**; prova de exemplo para o aluno: código **DEMOS**. Para ver a entrega ao vivo, abra o painel do professor numa aba e o aluno em outra do mesmo navegador. Esse modo não entra no build de produção.

## Rodando localmente

Pré-requisitos: Node 20+ e um projeto no [Supabase](https://supabase.com).

```bash
npm install
cp .env.example .env.local     # preencha URL e chave anon do projeto
npm run dev
```

### Configurando o banco

1. No painel do Supabase, abra **SQL Editor** e rode [supabase/migrations/0001_schema_inicial.sql](supabase/migrations/0001_schema_inicial.sql).
2. Em **Authentication → Providers**, habilite **Email** e, se quiser, **Google** (informe o Client ID/Secret do Google Cloud).
3. Em **Authentication → URL Configuration**, adicione a URL do site (e `http://localhost:5173`) em *Redirect URLs*.

## Scripts

| Comando             | O que faz                                  |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento                |
| `npm run build`     | Typecheck + build de produção em `dist/`   |
| `npm run typecheck` | Só o TypeScript                            |
| `npm run lint`      | ESLint                                     |
| `npm test`          | Testes unitários (correção e exportação)   |

## Estrutura

```
src/
├── app/            Roteamento (páginas carregadas sob demanda)
├── components/     Componentes reutilizáveis
│   ├── ui/         Button, Field, Modal, estados de carregando/erro/vazio
│   └── layout/     AppShell, RequireAuth, ConfigGate
├── contexts/       AuthContext, ToastContext
├── features/       Pedaços de interface específicos de um domínio (provas)
├── hooks/          Consultas e mutações (TanStack Query + Realtime)
├── lib/            Funções puras: correção, CSV, formatação, erros, cliente Supabase
├── pages/          Uma página por rota (professor/ para a área logada)
├── services/       Único lugar que fala com o Supabase
└── types/          Modelo de domínio
supabase/migrations/  Schema, RLS e funções do banco
```

## Segurança

- **O gabarito nunca chega ao aluno.** Fica na tabela `gabaritos`, legível só pelo professor dono da prova (RLS). O aluno recebe apenas a estrutura (disciplinas e nº de questões).
- **O aluno não acessa tabelas.** Usa duas funções (`buscar_avaliacao_aluno`, `enviar_entrega`) que validam código, status da prova, nome e formato das respostas.
- **Cada professor só vê o que é seu**, incluindo o canal Realtime de entregas.
- A correção é calculada no navegador do professor a partir do gabarito, de forma determinística e testada (`src/lib/grading.test.ts`).
- Exportação CSV protegida contra injeção de fórmulas.
- A chave `anon` do Supabase é pública por design; a proteção real é a RLS acima. **Nunca** use a chave `service_role` no front-end.

## Deploy

O build é estático (`dist/`). Em Vercel/Netlify, defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e use `npm run build`; os arquivos `vercel.json` e `public/_redirects` já configuram o fallback de SPA.

## Antes de lançar comercialmente

Itens conhecidos que dependem de decisão ou de configuração fora do código:

- **Teste ponta a ponta no Supabase real.** O SQL foi revisado por leitura, mas ainda não foi executado. Rode a migration em um projeto de teste e simule 2 professores e 1 aluno.
- **Limite de taxa nas funções anônimas.** O código tem 5 letras (≈8 milhões de combinações). Ative rate limit/CAPTCHA no Supabase (Authentication → Rate limits) ou coloque uma Edge Function na frente. Sem isso, alguém que conheça o código pode enviar entregas falsas (o professor consegue removê-las uma a uma).
- **Alunos homônimos.** A trava de "uma entrega por aluno" usa o nome. Dois alunos com o mesmo nome na mesma prova colidem; considere pedir matrícula/nº de chamada.
- **Editar o gabarito depois de criado** ainda não existe (hoje é preciso criar outra prova).
- **LGPD.** O sistema guarda nomes de alunos (possivelmente menores). Publique política de privacidade e defina retenção/exclusão de conta antes de vender.
- **Realtime** precisa estar habilitado no projeto Supabase (a migration adiciona `entregas` à publicação). A tela do professor também consulta a cada 15 s como reserva.
