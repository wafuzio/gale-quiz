# Vercel Setup for GALE Quiz Submissions

## What is already wired

- Frontend posts each completed submission to `POST /api/submissions`.
- The API route is implemented in `api/submissions.js`.
- Vercel root path `/` rewrites to `gale-quiz.html` via `vercel.json`.

## 1) Create/connect your Vercel project

1. Push this repo to GitHub (if not already).
2. In Vercel, click **Add New Project** and import this repo.
3. Framework preset can stay **Other**.
4. Build command: leave empty.
5. Output directory: leave empty.

## 2) Add a Vercel KV store

1. In your Vercel project, go to **Storage**.
2. Create a **KV** database and connect it to this project.
3. Vercel will provide env vars automatically.

Required env vars used by the API:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Optional but recommended:

- `SUBMISSIONS_ADMIN_KEY` (used to protect `GET /api/submissions` access)

## 3) Deploy

- Trigger a deploy from Vercel (or push a commit).
- Open your production URL. It should load the quiz directly.

## 4) Validate end-to-end collection

1. Submit one quiz response in production.
2. Confirm browser console has no submission errors.
3. Verify data retrieval with:

### If you set `SUBMISSIONS_ADMIN_KEY`

`curl -H "x-admin-key: YOUR_KEY" https://YOUR_DOMAIN/api/submissions`

### If you did not set `SUBMISSIONS_ADMIN_KEY`

`curl https://YOUR_DOMAIN/api/submissions`

## API behavior summary

### `POST /api/submissions`

- Accepts quiz payload JSON.
- Stores submissions in Vercel KV under key `galeQuizSubmissions`.
- Returns `{ ok: true, id: "..." }` on success.

### `GET /api/submissions`

- Returns `{ count, submissions }`.
- If `SUBMISSIONS_ADMIN_KEY` exists, request must provide key via:
  - header `x-admin-key`, or
  - query parameter `?key=...`
