# HUB Innovation Challenge Forms

Aplicação React com formulários independentes para finalistas e interessados, API Node e banco Supabase ou Postgres.

## Rotas

- `/confirmacao-finalistas`
- `/interesse-presencial`
- `/submissoes`

## Variáveis

Frontend:

```env
VITE_SUBMISSIONS_ENDPOINT=/api/submissions
```

API:

```env
PORT=80
SUPABASE_REST_URL=https://your-project.supabase.co/rest/v1
SUPABASE_SUBMISSIONS_TABLE=submissions
SUPABASE_SECRET_KEY=your-server-only-secret-key
```

Também são aceitos os aliases `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

Postgres local opcional:

```env
DATABASE_URL=postgres://user:password@host:5432/database
DATABASE_SSL=false
```

## Tabela no Supabase

Crie a tabela abaixo no SQL Editor do Supabase antes de publicar:

```sql
create table if not exists public.submissions (
  id text primary key,
  submitted_at timestamptz not null default now(),
  form_type text not null,
  full_name text,
  team_number text,
  whatsapp text,
  email text,
  status text,
  payload jsonb not null
);

create index if not exists idx_submissions_submitted_at
on public.submissions (submitted_at desc);

create index if not exists idx_submissions_form_type
on public.submissions (form_type);
```

## Docker local

```bash
docker compose up --build
```

Depois acesse:

- `http://localhost:3000/confirmacao-finalistas`
- `http://localhost:3000/interesse-presencial`
- `http://localhost:3000/submissoes`

## Easypanel

1. Crie a tabela `submissions` no Supabase usando o SQL acima.
2. Crie um app no Easypanel usando este repositório e o `Dockerfile`.
3. Configure as variáveis:

```env
PORT=80
VITE_SUBMISSIONS_ENDPOINT=/api/submissions
SUPABASE_REST_URL=https://your-project.supabase.co/rest/v1
SUPABASE_SUBMISSIONS_TABLE=submissions
SUPABASE_SECRET_KEY=your-server-only-secret-key
```

4. Alternativamente, se usar Postgres direto em vez de Supabase REST:

```env
DATABASE_URL=postgres://usuario:senha@host:5432/banco
DATABASE_SSL=true
```

O container serve o frontend e a API no mesmo domínio. Os formulários enviam para `/api/submissions` e a rota `/submissoes` lista os registros do banco.

No Easypanel, se a tela de domínio mostrar "Service is not reachable", confira se a porta pública/interna do app está apontando para a mesma porta do container. Este Dockerfile usa `PORT=80` por padrão. Se você mantiver `PORT=3000` nas variáveis, configure também a porta do serviço/domínio no Easypanel como `3000`.
