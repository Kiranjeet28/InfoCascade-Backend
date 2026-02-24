# InfoCascade Backend

Node.js + Express backend with MongoDB (Mongoose).

Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set `MONGO_URI`:

```bash
cp .env.example .env
# edit .env as needed
```

3. Run in development:

```bash
npm run dev
```

API endpoints
- `GET /api/users` - list users
- `POST /api/users` - create user { name, email }
- `GET /api/users/:id` - get user
- `PUT /api/users/:id` - update user
- `DELETE /api/users/:id` - delete user
