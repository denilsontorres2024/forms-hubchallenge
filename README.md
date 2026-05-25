# HUB Innovation Challenge Forms

Aplicação React com formulários independentes para finalistas e interessados, API Node e banco Supabase ou Postgres.

## Rotas

- `/confirmacao-finalistas`
- `/interesse-presencial`

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
SUPABASE_GUESTS_TABLE=guests
SUPABASE_SECRET_KEY=your-server-only-secret-key
```

Também são aceitos os aliases `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

Postgres local opcional:

```env
DATABASE_URL=postgres://user:password@host:5432/database
DATABASE_SSL=false
```

## Esquema no Supabase

Crie as tabelas abaixo no SQL Editor do Supabase antes de publicar. A tabela `submissions` guarda o envio principal do formulário. A tabela `guests` guarda cada convidado em uma linha e se relaciona com `submissions` por `submission_id`.

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

create table if not exists public.guests (
  id text primary key,
  submission_id text not null references public.submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  form_type text not null,
  guest_type text not null,
  position integer not null,
  full_name text not null,
  cpf text,
  whatsapp text,
  payload jsonb not null
);

create index if not exists idx_guests_submission_id
on public.guests (submission_id);

create index if not exists idx_guests_guest_type
on public.guests (guest_type);

create index if not exists idx_guests_form_type
on public.guests (form_type);
```

Valores esperados em `guest_type`:

- `guaranteed`: convidado garantido do formulário de finalistas.
- `extra`: convidado extra do formulário de finalistas.
- `requested`: convidado solicitado no formulário de interessados.

Consulta para ver envios com convidados:

```sql
select
  s.submitted_at,
  s.form_type,
  s.full_name as participant_name,
  s.team_number,
  g.guest_type,
  g.position,
  g.full_name as guest_name,
  g.cpf,
  g.whatsapp
from public.submissions s
left join public.guests g on g.submission_id = s.id
order by s.submitted_at desc, g.position asc;
```

## Docker local

```bash
docker compose up --build
```

Depois acesse:

- `http://localhost:3000/confirmacao-finalistas`
- `http://localhost:3000/interesse-presencial`

## Easypanel

1. Crie as tabelas `submissions` e `guests` no Supabase usando o SQL acima.
2. Crie um app no Easypanel usando este repositório e o `Dockerfile`.
3. Configure as variáveis:

```env
PORT=80
VITE_SUBMISSIONS_ENDPOINT=/api/submissions
SUPABASE_REST_URL=https://your-project.supabase.co/rest/v1
SUPABASE_SUBMISSIONS_TABLE=submissions
SUPABASE_GUESTS_TABLE=guests
SUPABASE_SECRET_KEY=your-server-only-secret-key
```

4. Alternativamente, se usar Postgres direto em vez de Supabase REST:

```env
DATABASE_URL=postgres://usuario:senha@host:5432/banco
DATABASE_SSL=true
```

O container serve o frontend e a API no mesmo domínio. Os formulários enviam para `/api/submissions`; a API grava o envio principal em `submissions` e os convidados relacionados em `guests`.

No Easypanel, se a tela de domínio mostrar "Service is not reachable", confira se a porta pública/interna do app está apontando para uma porta exposta pelo container. Em produção, o servidor tenta escutar em `PORT`, `80`, `3000` e `8080` para evitar conflito de proxy.
