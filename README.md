# HUB Innovation Challenge Forms

Aplicação React com formulários independentes para finalistas e interessados, API Node e banco Postgres.

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
PORT=3000
DATABASE_URL=postgres://user:password@host:5432/database
DATABASE_SSL=false
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

1. Crie um serviço Postgres no Easypanel.
2. Crie um app usando este repositório e o `Dockerfile`.
3. Configure as variáveis:

```env
PORT=3000
DATABASE_URL=postgres://usuario:senha@host:5432/banco
VITE_SUBMISSIONS_ENDPOINT=/api/submissions
```

4. Se o Postgres exigir SSL, adicione:

```env
DATABASE_SSL=true
```

O container serve o frontend e a API no mesmo domínio. Os formulários enviam para `/api/submissions` e a rota `/submissoes` lista os registros do banco.
