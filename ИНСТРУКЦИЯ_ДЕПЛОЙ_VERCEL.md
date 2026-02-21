# Пошаговая инструкция: деплой проекта на Vercel

Проект состоит из **фронтенда** (Vite + React) и **бэкенда** (Express API). На Vercel их нужно задеплоить **двумя отдельными проектами** из одного репозитория на GitHub.

---

## Что понадобится заранее

- Репозиторий на GitHub (уже запушен).
- Аккаунт на [Vercel](https://vercel.com).
- База данных PostgreSQL (например [Neon](https://neon.tech) или другая с поддержкой SSL).
- API-ключи: Google OAuth, OpenRouter (и при необходимости Anthropic, OpenAI).
- JWT-секреты (можно сгенерировать: `openssl rand -base64 32`).

---

## Часть 1. Деплой бэкенда (API)

### Шаг 1.1. Создать проект в Vercel

1. Зайди на [vercel.com](https://vercel.com) и войди в аккаунт.
2. Нажми **Add New…** → **Project**.
3. Импортируй свой репозиторий с GitHub (если ещё не подключён — подключи GitHub в настройках Vercel).
4. Выбери нужный репозиторий и нажми **Import**.

### Шаг 1.2. Настроить корневую папку бэкенда

1. В настройках импорта найди **Root Directory**.
2. Нажми **Edit** и укажи: **`backend`**.
3. Корнем сборки станет папка `backend` (в ней лежат `package.json`, `vercel.json`, `api/`).

### Шаг 1.3. Сборка бэкенда (Build and Output)

- **Framework Preset:** оставь **Other** или **Vite** — не важно, конфиг в `vercel.json`.
- **Build Command:** в `backend/vercel.json` уже указано `npm run build` — менять не нужно.
- **Output Directory:** для serverless API отдельная папка вывода не задаётся — Vercel использует функции из `api/`.

Проверь, что в **Root Directory** действительно указано **`backend`**. Тогда Vercel будет запускать `npm run build` внутри `backend/` и собирать `dist/` там же.

### Шаг 1.4. Переменные окружения бэкенда

В проекте Vercel открой **Settings** → **Environment Variables** и добавь переменные (для **Production**, при необходимости — и для Preview):

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_ACCESS_SECRET` | Секрет для access JWT (минимум 32 символа) | сгенерировать: `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Секрет для refresh JWT | то же |
| `JWT_ACCESS_EXPIRY` | Время жизни access-токена | `15m` |
| `JWT_REFRESH_EXPIRY` | Время жизни refresh-токена | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | из Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | из Google Cloud Console |
| `OPENROUTER_API_KEY` | Ключ OpenRouter | с сайта OpenRouter |
| `FRONTEND_URL` | URL фронтенда (без слэша в конце) | Пока оставь пустым — подставишь после деплоя фронта |
| `PORT` | Не обязателен на Vercel | можно не задавать |

Опционально (если используешь):  
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CHAT_DATABASE_URL`, `SOLANA_RPC_ENDPOINT`, `SOLANA_WS_ENDPOINT`.

Полный список можно сверить с **`backend/.env.example`**.

### Шаг 1.5. Задеплоить бэкенд

1. Нажми **Deploy**.
2. Дождись окончания сборки.
3. Скопируй **URL проекта** (например `https://your-backend-xxx.vercel.app`) — он понадобится для фронта и для `FRONTEND_URL`.

### Шаг 1.6. Проверить бэкенд

Открой в браузере:

```
https://ТВОЙ-БЭКЕНД-URL.vercel.app/api/health
```

Ожидаемый ответ (или похожий):  
`{"status":"ok","timestamp":"...","uptime":...,"database":"connected"}`.

Если видишь такой JSON — бэкенд и БД работают.

---

## Часть 2. Деплой фронтенда

### Шаг 2.1. Создать второй проект в Vercel

1. Снова **Add New…** → **Project**.
2. Выбери **тот же репозиторий** на GitHub.
3. **Root Directory** оставь **пустым** (корень репозитория).  
   Сборка будет идти из корня, где лежат `package.json`, `vite.config.*`, `src/` и корневой `vercel.json`.

### Шаг 2.2. Сборка фронтенда

- **Build Command:** в корневом `vercel.json` задано `npm run build` — менять не нужно.
- **Output Directory:** `dist` (уже указано в `vercel.json`).
- **Framework Preset:** Vite — подставится автоматически по конфигу.

### Шаг 2.3. Переменные окружения фронтенда

В **Settings** → **Environment Variables** добавь (для **Production** и при необходимости для Preview):

| Переменная | Значение | Обязательно |
|------------|----------|-------------|
| `VITE_API_URL` | URL бэкенда из шага 1.5 **без слэша в конце** | Да |
| `VITE_GOOGLE_CLIENT_ID` | Тот же Google Client ID, что и на бэкенде | Если есть Google-логин |
| `VITE_SOLANA_RPC_ENDPOINT` | RPC Solana (например `https://api.mainnet-beta.solana.com`) | Если нужна Solana |
| `VITE_SOLANA_WS_ENDPOINT` | WebSocket Solana | Если нужна Solana |

Пример:  
`VITE_API_URL` = `https://your-backend-xxx.vercel.app`

**Важно:** без правильного `VITE_API_URL` в production фронт не сможет обращаться к API.

### Шаг 2.4. Задеплоить фронтенд

Нажми **Deploy** и дождись окончания сборки. Скопируй URL фронта (например `https://your-front-xxx.vercel.app`).

---

## Часть 3. Связать фронт и бэкенд (CORS)

Чтобы браузер мог ходить с фронта на бэкенд, бэкенд должен разрешить твой домен фронта.

### Шаг 3.1. Указать URL фронта в бэкенде

1. Открой в Vercel **проект бэкенда** (Root Directory = `backend`).
2. **Settings** → **Environment Variables**.
3. Найди или создай переменную **`FRONTEND_URL`**.
4. Установи значение = **URL фронта без слэша в конце**, например:  
   `https://your-front-xxx.vercel.app`
5. Несколько доменов можно задать через запятую.
6. Сохрани переменную.

### Шаг 3.2. Обновить CORS в коде (если другой домен)

В репозитории в файле **`backend/vercel.json`** в заголовках CORS указан пример:  
`https://oneprompt-front.vercel.app`.  
Если твой фронт на другом домене — главное, чтобы в переменной **`FRONTEND_URL`** на Vercel был правильный URL. Обработчик в **`backend/api/[...path].ts`** подставляет разрешённый origin из `FRONTEND_URL`, так что после установки `FRONTEND_URL` перезадеплой бэкенда обычно достаточен (при необходимости нажми **Redeploy** в проекте бэкенда).

---

## Часть 4. Финальная проверка

1. Открой в браузере URL фронта (например `https://your-front-xxx.vercel.app`).
2. Проверь логин (если есть Google OAuth).
3. Проверь запросы к API: в DevTools → Network запросы должны уходить на `https://твой-бэкенд.vercel.app/api/...`, а не на `localhost`.

---

## Краткая шпаргалка

| Действие | Где |
|----------|-----|
| Деплой API | Новый проект, Root Directory = **`backend`** |
| Деплой фронта | Новый проект, Root Directory = **пусто** |
| URL бэкенда | Задать во фронте как **`VITE_API_URL`** |
| URL фронта | Задать в бэкенде как **`FRONTEND_URL`** |
| Проверка API | `https://бэкенд.vercel.app/api/health` |

---

## Частые проблемы

**CORS: «The 'Access-Control-Allow-Origin' header has a value '...' that is not equal to the supplied origin»**  
- В проекте **бэкенда** в Vercel задай переменную **`FRONTEND_URL`** = точный URL фронта (например `https://frontend-dusky-psi-14.vercel.app`), без слэша в конце.  
- В репозитории в `backend/vercel.json` не должно быть жёстко прописанного чужого домена для CORS — CORS для `/api/*` выставляет только код в `backend/api/[...path].ts` по значению `FRONTEND_URL`.  
- После смены переменной или кода сделай **Redeploy** бэкенда.

**Google: «The given origin is not allowed for the given client ID» (403)**  
- Зайди в [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → выбери OAuth 2.0 Client ID (типа Web application).  
- В **Authorized JavaScript origins** добавь точный URL фронта, например:  
  `https://frontend-dusky-psi-14.vercel.app`  
  (и при необходимости `https://твой-домен.vercel.app` для превью).  
- В **Authorized redirect URIs** добавь URL бэкенда с путём, например:  
  `https://llm-router-ten.vercel.app/api/auth/google/callback`  
  (подставь свой URL бэкенда, если другой).  
- Сохрани изменения; через несколько минут кнопка «Войти через Google» начнёт работать.

**404 на `/api/...`**  
- Убедись, что деплоишь именно папку `backend` (Root Directory = `backend`).  
- Проверь, что в логах сборки бэкенда есть успешный `npm run build` и в артефактах есть `dist/server-app.js`.

**CORS / запросы блокируются**  
- В проекте бэкенда задана переменная **`FRONTEND_URL`** с точным URL фронта (без слэша).  
- После изменения `FRONTEND_URL` сделай **Redeploy** бэкенда.

**Фронт ходит на localhost в production**  
- В проекте **фронтенда** в Production обязательно задана **`VITE_API_URL`** = URL бэкенда (например `https://your-backend.vercel.app`).  
- Переменные с префиксом `VITE_` вшиваются в сборку при билде — после смены переменной нужен новый деплой.

**Deployment Protection (пароль/Vercel Auth)**  
- Если включена защита деплоя, OPTIONS-запросы могут не доходить до API. В настройках проекта бэкенда: **Settings** → **Deployment Protection** → в **OPTIONS Allowlist** добавь путь **`/api`**.

---

После выполнения этих шагов проект будет задеплоен на Vercel: фронт и бэкенд — двумя проектами, связанными через `VITE_API_URL` и `FRONTEND_URL`.
