# Раздельный деплой на Vercel (фронт и бэкенд отдельно)

Код настроен для работы с раздельным деплоем — фронт и бэкенд могут быть в одном репозитории или в разных.

## Вариант 1: Два проекта в Vercel из одного репозитория

### 1. Проект «Backend» (API)

- **Root Directory:** `backend`
- Репозиторий: этот же репо
- **Environment Variables:** скопируй из `backend/.env.example` (DATABASE_URL, JWT_*, GOOGLE_*, OPENROUTER_API_KEY, FRONTEND_URL и т.д.)
- **FRONTEND_URL:** укажи URL фронта после его деплоя, например `https://your-front.vercel.app` (без слэша в конце)
  - Можно указать несколько доменов через запятую: `https://front.vercel.app,https://www.front.com`
  - Для тестирования можно временно использовать `*` (разрешает все домены, небезопасно для production)
- После деплоя скопируй URL бэкенда (например `https://your-backend.vercel.app`)

### 2. Проект «Frontend»

- **Root Directory:** оставь пустым (корень репо)
- **Environment Variables:**
  - **VITE_API_URL:** URL бэкенда из шага 1, например `https://your-backend.vercel.app`
  - Остальные по необходимости: `VITE_GOOGLE_CLIENT_ID`, `VITE_SOLANA_*` и т.д.

### Порядок

1. Задеплой сначала **Backend** (Root Directory = `backend`), получи URL.
2. Задеплой **Frontend** (корень репо), в переменных задай **VITE_API_URL** = URL бэкенда.
3. **ВАЖНО:** В настройках Backend в Vercel задай **FRONTEND_URL** = URL фронта (например `https://your-front.vercel.app`).
   - Без этой переменной CORS будет блокировать запросы от фронта!
   - Можно временно использовать `*` для тестирования, но в production укажи конкретный URL.
4. После изменения **FRONTEND_URL** перезадеплой Backend (или подожди автоматического редеплоя).

## Локальная разработка

- Фронт: `npm run dev` (порт 5173). По умолчанию API = `http://localhost:3001`
- Бэкенд: `cd backend && npm run dev` (порт 3001)
- В корне `.env`: `VITE_API_URL=http://localhost:3001`
- В `backend/.env`: `FRONTEND_URL=http://localhost:5173`

## Вариант 2: Два отдельных репозитория

Если фронт и бэкенд в разных репозиториях:

### Backend репозиторий:
- Содержит только папку `backend/` (или весь репо — это папка backend)
- **Root Directory:** оставь пустым (или `backend` если это подпапка)
- **Environment Variables:** из `backend/.env.example`
- **FRONTEND_URL:** URL фронта после деплоя

### Frontend репозиторий:
- Содержит только фронтенд код (корень репо)
- **Root Directory:** пусто
- **Environment Variables:**
  - **VITE_API_URL:** URL бэкенда (обязательно!)
  - Остальные переменные по необходимости

**Важно:** При деплое из разных репозиториев обязательно задай `VITE_API_URL` во фронте, иначе API запросы не будут работать.

## CORS (если меняется URL фронта)

CORS заголовки заданы в **backend/vercel.json** с origin `https://oneprompt-front.vercel.app`. Если URL фронта другой, отредактируй в `backend/vercel.json` значение `Access-Control-Allow-Origin` и задеплой бэкенд заново.

## Если CORS preflight (OPTIONS) всё равно блокируется

Включена ли у бэкенда **Deployment Protection** (Vercel Authentication, Password Protection и т.п.)? Тогда preflight-запросы OPTIONS могут не доходить до функции.

1. Открой проект **Backend** в Vercel → **Settings** → **Deployment Protection**.
2. В блоке **OPTIONS Allowlist** добавь путь **`/api`** (или включи обход для OPTIONS по инструкции [Vercel OPTIONS Allowlist](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/options-allowlist)).
3. Сохрани настройки. После этого OPTIONS-запросы к `/api/*` должны проходить и CORS preflight будет успешным.

## Проверка работы бэкенда (health)

Эндпоинт **/api/health** доступен с любых IP и адресов (без ограничений CORS для этого пути).

**Как проверить:**

- В браузере или curl:  
  `https://onemprompt-backend.vercel.app/api/health`
- Успешный ответ: `{"status":"ok","timestamp":"...","uptime":...,"database":"connected"}`
- Если видишь этот JSON — бэкенд работает и БД доступна.

**Что обновлять после правок:**

- Изменения только в **backend** (vercel.json, api, server-app) → обновляй и деплой **только репозиторий бэкенда**.
- Изменения только во фронте → обновляй и деплой **только репозиторий фронта**.
