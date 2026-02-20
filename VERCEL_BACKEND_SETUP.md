# Настройка бэкенда на Vercel

## Что было сделано

1. ✅ Создан `backend/src/server-app.ts` - Express app для serverless окружения
2. ✅ Создан `api/[...path].ts` - Vercel Serverless Function wrapper для Express
3. ✅ Добавлен `@vercel/node` в зависимости

## Что нужно сделать

### Шаг 1: Установить зависимости

Выполните в корне проекта:
```bash
npm install
```

Это установит `@vercel/node` который необходим для работы serverless functions.

### Шаг 2: Убедиться что backend зависимости доступны

Vercel автоматически устанавливает зависимости из корневого `package.json`, но НЕ из подпапок.

**Вариант А (рекомендуется):** Скопировать backend зависимости в корневой `package.json`

Или убедитесь что в Vercel настроены правильные build команды для установки зависимостей из `backend/`.

**Вариант Б:** Добавить в `vercel.json`:
```json
{
  "buildCommand": "cd backend && npm install && cd .. && npm install && npm run build"
}
```

Но лучше скопировать необходимые зависимости backend в корневой `package.json`.

### Шаг 3: Пересобрать и задеплоить

```bash
npm run build
```

Затем задеплойте в Vercel (или он запустится автоматически при push в git).

## Как это работает

1. Запрос приходит на `https://onepromptprod3.vercel.app/api/auth/login`
2. Vercel направляет его в `api/[...path].ts` serverless function
3. Handler восстанавливает путь `/api/auth/login` и передает в Express app
4. Express обрабатывает запрос и возвращает ответ

## Проверка

После деплоя проверьте:
- `https://onepromptprod3.vercel.app/api/auth/login` должен возвращать ответ (не 404)
- `https://onepromptprod3.vercel.app/health` должен работать

## Возможные проблемы

Если все еще получаете 404:
1. Проверьте что `api/[...path].ts` файл существует
2. Проверьте что все зависимости установлены
3. Проверьте логи в Vercel Dashboard → Functions → api/[...path]
4. Убедитесь что backend зависимости доступны (express, cors, и т.д.)
