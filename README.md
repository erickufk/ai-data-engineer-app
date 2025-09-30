# 🤖 AI Data Engineer App

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://aidataengineer.vercel.app/)

Access the app https://aidataengineer.vercel.app 

**Автоматическая генерация пайплайнов обработки данных с помощью искусственного интеллекта**

AI Data Engineer — это интеллектуальная платформа для автоматизации создания ETL/ELT пайплайнов. Приложение анализирует ваши данные, предлагает оптимальные решения для хранения и генерирует готовый к развертыванию код с полной документацией.

---

## 📋 Содержание

- [Возможности](#-возможности)
- [Технологический стек](#-технологический-стек)
- [Архитектура приложения](#-архитектура-приложения)
- [Предварительные требования](#-предварительные-требования)
- [Установка](#-установка)
- [Переменные окружения](#-переменные-окружения)
- [Запуск приложения](#-запуск-приложения)
- [Структура проекта](#-структура-проекта)
- [Ключевые компоненты](#-ключевые-компоненты)
- [API маршруты](#-api-маршруты)
- [Настройка базы данных](#-настройка-базы-данных)
- [Развертывание](#-развертывание)
- [Разработка](#-разработка)
- [Устранение неполадок](#-устранение-неполадок)
- [Лицензия](#-лицензия)

---

## ✨ Возможности

### 🎯 Основные функции

- **Умный анализ данных**: Автоматическое профилирование файлов (CSV, JSON, XML, Excel) с определением типов данных, временных полей и статистики
- **AI-рекомендации**: Интеллектуальный выбор оптимального хранилища данных (PostgreSQL, ClickHouse, HDFS) на основе анализа
- **Визуальный конструктор**: Пошаговая настройка подключений к источникам и целевым системам с интуитивным интерфейсом
- **Маппинг полей**: Гибкое сопоставление полей источника и цели с поддержкой 1:1 маппинга и ручной настройки
- **Генерация кода**: Автоматическое создание DDL скриптов, Airflow DAG, конфигурационных файлов и документации
- **AI-помощник**: Встроенный чат-ассистент с поддержкой Markdown для помощи на каждом этапе
- **Управление проектами**: Сохранение и загрузка проектов с полной историей настроек

### 🔧 Технические возможности

- **Поддержка форматов**: CSV, JSON, XML, Excel (XLSX, XLS)
- **Интеграции**: PostgreSQL, ClickHouse, Kafka, HDFS, локальные файлы
- **Режимы загрузки**: Append, Merge, Upsert с настройкой дедупликации
- **Расписания**: Hourly, Daily, Weekly с поддержкой cron-выражений
- **Партиционирование**: По дате, по ключу, с настройкой watermark
- **Экспорт**: ZIP-архив с готовым к развертыванию кодом и документацией

---

## 🛠 Технологический стек

### Frontend

- **[Next.js 14](https://nextjs.org/)** - React-фреймворк с App Router
- **[React 18](https://react.dev/)** - UI библиотека
- **[TypeScript 5](https://www.typescriptlang.org/)** - Типизация
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Утилитарный CSS-фреймворк
- **[shadcn/ui](https://ui.shadcn.com/)** - Компонентная библиотека
- **[Radix UI](https://www.radix-ui.com/)** - Примитивы для доступных компонентов
- **[Lucide React](https://lucide.dev/)** - Иконки
- **[React Markdown](https://github.com/remarkjs/react-markdown)** - Рендеринг Markdown

### Backend & AI

- **[Google Gemini AI](https://ai.google.dev/)** - LLM для анализа данных и генерации рекомендаций
- **[Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - Серверные эндпоинты
- **[Supabase](https://supabase.com/)** - PostgreSQL база данных и аутентификация
- **[Neon](https://neon.tech/)** - Serverless PostgreSQL (альтернатива)

### Утилиты

- **[JSZip](https://stuvus.github.io/JSZip/)** - Генерация ZIP-архивов
- **[date-fns](https://date-fns.org/)** - Работа с датами
- **[Zod](https://zod.dev/)** - Валидация схем
- **[React Hook Form](https://react-hook-form.com/)** - Управление формами

---

## 🏗 Архитектура приложения

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Главная    │  │   Проекты    │  │  Помощь      │       │
│  │   страница   │  │   (демо)     │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Пошаговый конструктор (6 шагов)              │   │
│  │  1. Старт → 2. Загрузка → 3. Рекомендации →          │   │
│  │  4. Пайплайн → 5. Обзор → 6. Экспорт                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              AI-помощник (чат)                       │   │
│  │  - Контекстная помощь на каждом шаге                 │   │
│  │  - Markdown поддержка                                │   │
│  │  - История диалогов                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   API Routes (Backend)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ /api/profile │  │ /api/llm/    │  │ /api/generate│       │
│  │ Анализ файлов│  │ chat         │  │ /spec, /zip  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                             │
│  ┌──────────────┐                                           │
│  │ /api/projects│  Управление проектами                     │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Внешние сервисы                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Google Gemini│  │  Supabase    │  │    Neon      │       │
│  │     AI       │  │  PostgreSQL  │  │  PostgreSQL  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Поток данных

1. **Загрузка файла** → Профилирование (первые 10MB для CSV/XML/Excel, полностью для JSON)
2. **Анализ LLM** → Gemini AI анализирует структуру и предлагает рекомендации
3. **Конфигурация** → Пользователь настраивает маппинг, расписание, режим загрузки
4. **Генерация** → Создание DDL, ETL кода, конфигов, документации
5. **Экспорт** → ZIP-архив с готовым проектом
6. **Сохранение** → Проект сохраняется в Supabase/Neon для последующего доступа

---

## 📦 Предварительные требования

Перед установкой убедитесь, что у вас установлены:

- **Node.js** >= 18.17.0 ([скачать](https://nodejs.org/))
- **npm** >= 9.0.0 или **yarn** >= 1.22.0 или **pnpm** >= 8.0.0
- **Git** ([скачать](https://git-scm.com/))
- **Google Gemini API Key** ([получить](https://ai.google.dev/))
- **Supabase проект** ([создать](https://supabase.com/)) или **Neon проект** ([создать](https://neon.tech/))

---

## 🚀 Установка

### 1. Клонирование репозитория

\`\`\`bash
git clone https://github.com/erickufk/ai-data-engineer-app.git
cd ai-data-engineer-app
\`\`\`

### 2. Установка зависимостей

Выберите ваш пакетный менеджер:

\`\`\`bash
# npm
npm install

# yarn
yarn install

# pnpm
pnpm install
\`\`\`

### 3. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Заполните переменные окружения (см. раздел [Переменные окружения](#-переменные-окружения))

### 4. Настройка базы данных

Выполните SQL-скрипты для создания таблиц (см. раздел [Настройка базы данных](#-настройка-базы-данных))

---

## 🔐 Переменные окружения

Создайте файл `.env.local` со следующими переменными:

### Обязательные переменные

\`\`\`env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (если используете Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000

# Supabase PostgreSQL
SUPABASE_POSTGRES_URL=postgresql://postgres:[password]@[host]:5432/postgres
SUPABASE_POSTGRES_PRISMA_URL=postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true
SUPABASE_POSTGRES_URL_NON_POOLING=postgresql://postgres:[password]@[host]:5432/postgres
SUPABASE_POSTGRES_USER=postgres
SUPABASE_POSTGRES_PASSWORD=your_password
SUPABASE_POSTGRES_DATABASE=postgres
SUPABASE_POSTGRES_HOST=your-project.supabase.co

# Neon (если используете Neon вместо Supabase)
DATABASE_URL=postgresql://user:password@host/database
POSTGRES_URL=postgresql://user:password@host/database
POSTGRES_PRISMA_URL=postgresql://user:password@host/database?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://user:password@host/database
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=database
POSTGRES_HOST=host
NEON_PROJECT_ID=your_neon_project_id
\`\`\`

### Опциональные переменные

\`\`\`env
# Sentry (для мониторинга ошибок)
SENTRY_DSN=your_sentry_dsn

# Vercel Analytics (автоматически при деплое на Vercel)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
\`\`\`

### Как получить API ключи

#### Google Gemini API Key

1. Перейдите на [Google AI Studio](https://ai.google.dev/)
2. Войдите с Google аккаунтом
3. Нажмите "Get API Key"
4. Создайте новый API ключ
5. Скопируйте ключ в `GEMINI_API_KEY`

#### Supabase

1. Создайте проект на [supabase.com](https://supabase.com/)
2. Перейдите в Settings → API
3. Скопируйте:
   - Project URL → `SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `SUPABASE_ANON_KEY` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY`
4. Перейдите в Settings → Database
5. Скопируйте Connection String → `SUPABASE_POSTGRES_URL`

#### Neon

1. Создайте проект на [neon.tech](https://neon.tech/)
2. Скопируйте Connection String из дашборда
3. Вставьте в `DATABASE_URL` и другие `POSTGRES_*` переменные

---

## ▶️ Запуск приложения

### Режим разработки

\`\`\`bash
npm run dev
# или
yarn dev
# или
pnpm dev
\`\`\`

Приложение будет доступно по адресу: **http://localhost:3000**

### Production сборка

\`\`\`bash
# Сборка
npm run build

# Запуск production сервера
npm run start
\`\`\`

### Линтинг

\`\`\`bash
npm run lint
\`\`\`

---

## 📁 Структура проекта

```
ai-data-engineer-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   ├── generate/             # Генерация артефактов
│   │   │   ├── artifacts/        # Генерация файлов проекта
│   │   │   ├── spec/             # Генерация спецификации
│   │   │   └── zip/              # Создание ZIP-архива
│   │   ├── llm/                  # LLM интеграция
│   │   │   ├── chat/             # Чат с AI-помощником
│   │   │   └── suggestions/      # Быстрые подсказки
│   │   ├── profile/              # Профилирование файлов
│   │   └── projects/             # CRUD операции с проектами
│   ├── projects/                 # Страница проектов (демо)
│   ├── globals.css               # Глобальные стили
│   ├── layout.tsx                # Корневой layout
│   └── page.tsx                  # Главная страница
│
├── components/                   # React компоненты
│   ├── ui/                       # shadcn/ui компоненты
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...                   # 40+ UI компонентов
│   ├── header.tsx                # Шапка приложения
│   ├── pipeline-canvas.tsx       # Визуальный редактор пайплайна
│   └── visual-constructor/       # Конструктор пайплайна
│       ├── step-constructor.tsx  # Главный компонент конструктора
│       ├── source-config.tsx     # Настройка источника
│       ├── target-config.tsx     # Настройка цели
│       ├── field-mapping.tsx     # Маппинг полей
│       ├── schedule-config.tsx   # Настройка расписания
│       ├── unified-ai-chat.tsx   # AI-помощник
│       ├── system-presets.ts     # Пресеты систем
│       └── file-preview-analysis.tsx  # Анализ файлов
│
├── lib/                          # Утилиты и типы
│   ├── types.ts                  # TypeScript типы
│   ├── utils.ts                  # Вспомогательные функции
│   ├── llm-service.ts            # Сервис для работы с LLM
│   └── dummy-data.ts             # Тестовые данные
│
├── hooks/                        # React хуки
│   ├── use-mobile.tsx            # Определение мобильного устройства
│   └── use-toast.ts              # Уведомления
│
├── public/                       # Статические файлы
│
├── .env.local                    # Переменные окружения (не в git)
├── .env.example                  # Пример переменных окружения
├── .gitignore                    # Git ignore файл
├── next.config.mjs               # Конфигурация Next.js
├── package.json                  # Зависимости проекта
├── tsconfig.json                 # Конфигурация TypeScript
├── tailwind.config.ts            # Конфигурация Tailwind CSS
└── README.md                     # Документация (этот файл)
```
---

## 🧩 Ключевые компоненты

### 1. Главная страница (`app/page.tsx`)

Основной компонент приложения с пошаговым мастером создания пайплайна:

- **Шаг 0: Старт** - Создание проекта и выбор типа источника
- **Шаг 1: Загрузка** - Загрузка файлов или настройка подключений
- **Шаг 2: Рекомендации** - AI-анализ и выбор хранилища
- **Шаг 3: Пайплайн** - Визуальное построение пайплайна
- **Шаг 4: Обзор** - Просмотр сгенерированных артефактов
- **Шаг 5: Экспорт** - Скачивание ZIP-архива

### 2. Конструктор (`components/visual-constructor/step-constructor.tsx`)

Пошаговый конструктор для настройки ETL пайплайна:

- **Шаг 1: Источник** - Выбор и настройка источника данных
- **Шаг 2: Цель** - Выбор и настройка целевой системы
- **Шаг 3: Маппинг** - Сопоставление полей источника и цели
- **Шаг 4: Расписание** - Настройка режима загрузки и расписания

### 3. AI-помощник (`components/visual-constructor/unified-ai-chat.tsx`)

Интеллектуальный чат-ассистент:

- Контекстная помощь на каждом шаге
- Поддержка Markdown для форматированных ответов
- Быстрые подсказки (Quick Suggestions)
- История диалогов

### 4. Анализ файлов (`components/visual-constructor/file-preview-analysis.tsx`)

Компонент для профилирования и анализа данных:

- Определение типов данных
- Статистика по полям
- Анализ качества данных
- Обнаружение дубликатов
- Визуализация распределений

### 5. Маппинг полей (`components/visual-constructor/field-mapping.tsx`)

Интерфейс для сопоставления полей:

- Drag & Drop для маппинга
- 1:1 автоматический маппинг
- Ручное создание целевых полей
- Валидация маппинга

---

## 🔌 API маршруты

### POST `/api/profile`

Профилирование загруженных файлов

**Request:**
\`\`\`typescript
FormData {
  files: File[]
  originalSize: string
  sampledBytes: string
  isFullFile: string
}
\`\`\`

**Response:**
\`\`\`typescript
{
  format: string
  columns: string[]
  inferredTypes: Record<string, string>
  sampleRowsCount: number
  timeFields: string[]
  schemaConfidence: number
  sampleInfo?: {
    samplingStrategy: string
    sampledBytes: number
    originalSize: number
    percent: number
  }
}
\`\`\`

### POST `/api/llm/chat`

Чат с AI-помощником

**Request:**
\`\`\`typescript
{
  messages: Array<{
    role: "user" | "assistant"
    content: string
  }>
  context?: {
    currentStep: number
    sourcePreset?: SystemPreset
    targetPreset?: SystemPreset
    // ... другие контекстные данные
  }
}
\`\`\`

**Response:**
\`\`\`typescript
{
  response: string
}
\`\`\`

### POST `/api/llm/suggestions`

Быстрые подсказки для AI-помощника

**Request:**
\`\`\`typescript
{
  context: {
    currentStep: number
    sourcePreset?: SystemPreset
    targetPreset?: SystemPreset
  }
}
\`\`\`

**Response:**
\`\`\`typescript
{
  suggestions: string[]
}
\`\`\`

### POST `/api/generate/spec`

Генерация спецификации пайплайна

**Request:**
\`\`\`typescript
{
  projectMeta: {
    name: string
    description: string
  }
  ingest: {
    mode: "file" | "constructor"
    fileProfile?: FileProfile
    constructorSpec?: ConstructorSpec
  }
  recommendation: Recommendation
  pipeline: {
    nodes: Node[]
    edges: Edge[]
  }
}
\`\`\`

**Response:**
\`\`\`typescript
{
  reportDraft: string
  artifacts: Array<{
    name: string
    content: string
    type: string
  }>
}
\`\`\`

### POST `/api/generate/zip`

Создание ZIP-архива с проектом

**Request:**
\`\`\`typescript
{
  pipelineSpec: PipelineSpec
  reportDraft: string
}
\`\`\`

**Response:**
\`\`\`
application/zip (binary)
\`\`\`

### GET/POST/PUT/DELETE `/api/projects`

CRUD операции с проектами

**GET** - Получить все проекты
**POST** - Создать новый проект
**PUT** - Обновить проект
**DELETE** - Удалить проект

---

## 🗄 Настройка базы данных

### Supabase

1. Создайте проект на [supabase.com](https://supabase.com/)

2. Выполните SQL-скрипт для создания таблицы проектов:

\`\`\`sql
-- Создание таблицы проектов
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  source_preset JSONB,
  target_preset JSONB,
  source_config JSONB,
  target_config JSONB,
  field_mapping JSONB,
  schedule JSONB,
  load_mode TEXT,
  pipeline_nodes JSONB,
  pipeline_edges JSONB,
  file_profile JSONB,
  recommendation JSONB,
  artifacts_preview JSONB,
  report_draft TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по имени
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- Индекс для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (опционально, для мультитенантности)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Политика: все пользователи могут читать все проекты
CREATE POLICY "Allow public read access" ON projects
  FOR SELECT USING (true);

-- Политика: все пользователи могут создавать проекты
CREATE POLICY "Allow public insert access" ON projects
  FOR INSERT WITH CHECK (true);

-- Политика: все пользователи могут обновлять проекты
CREATE POLICY "Allow public update access" ON projects
  FOR UPDATE USING (true);

-- Политика: все пользователи могут удалять проекты
CREATE POLICY "Allow public delete access" ON projects
  FOR DELETE USING (true);
\`\`\`

3. Настройте переменные окружения (см. раздел [Переменные окружения](#-переменные-окружения))

### Neon

1. Создайте проект на [neon.tech](https://neon.tech/)

2. Подключитесь к базе данных через psql или любой PostgreSQL клиент:

\`\`\`bash
psql postgresql://user:password@host/database
\`\`\`

3. Выполните тот же SQL-скрипт, что и для Supabase (см. выше)

4. Настройте переменные окружения

---

## 🚢 Развертывание

### Vercel (рекомендуется)

1. Установите Vercel CLI:

\`\`\`bash
npm install -g vercel
\`\`\`

2. Войдите в Vercel:

\`\`\`bash
vercel login
\`\`\`

3. Разверните проект:

\`\`\`bash
vercel
\`\`\`

4. Настройте переменные окружения в Vercel Dashboard:
   - Перейдите в Settings → Environment Variables
   - Добавьте все переменные из `.env.local`

5. Для production деплоя:

\`\`\`bash
vercel --prod
\`\`\`

### Альтернативные платформы

#### Docker

Создайте `Dockerfile`:

\`\`\`dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
\`\`\`

Соберите и запустите:

\`\`\`bash
docker build -t ai-data-engineer .
docker run -p 3000:3000 --env-file .env.local ai-data-engineer
\`\`\`

#### Netlify

1. Установите Netlify CLI:

\`\`\`bash
npm install -g netlify-cli
\`\`\`

2. Разверните:

\`\`\`bash
netlify deploy --prod
\`\`\`

---

## 👨‍💻 Разработка

### Структура кода

- **Компоненты**: Используйте функциональные компоненты с TypeScript
- **Стили**: Tailwind CSS с утилитарными классами
- **Состояние**: React hooks (useState, useEffect, useCallback)
- **Типизация**: Строгая типизация с TypeScript

### Добавление нового пресета системы

1. Откройте `components/visual-constructor/system-presets.ts`

2. Добавьте новый пресет:

\`\`\`typescript
export const systemPresets: SystemPreset[] = [
  // ... существующие пресеты
  {
    id: "my-system",
    name: "My System",
    type: "source", // или "target"
    icon: Database,
    description: "Описание системы",
    configFields: [
      {
        name: "host",
        label: "Host",
        type: "text",
        required: true,
        placeholder: "localhost",
      },
      // ... другие поля
    ],
  },
]
\`\`\`

3. Обновите типы в `lib/types.ts` если необходимо

### Добавление нового API маршрута

1. Создайте файл в `app/api/your-route/route.ts`:

\`\`\`typescript
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Ваша логика
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
\`\`\`

### Тестирование

\`\`\`bash
# Запуск линтера
npm run lint

# Проверка типов
npx tsc --noEmit
\`\`\`

---

## 🐛 Устранение неполадок

### Проблема: "GEMINI_API_KEY is not defined"

**Решение:**
1. Убедитесь, что файл `.env.local` существует в корне проекта
2. Проверьте, что `GEMINI_API_KEY` указан в `.env.local`
3. Перезапустите dev сервер: `npm run dev`

### Проблема: "Failed to connect to database"

**Решение:**
1. Проверьте правильность DATABASE_URL в `.env.local`
2. Убедитесь, что база данных доступна
3. Проверьте, что таблица `projects` создана (см. [Настройка базы данных](#-настройка-базы-данных))

### Проблема: "Module not found" ошибки

**Решение:**
\`\`\`bash
# Удалите node_modules и переустановите
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Проблема: Файлы не анализируются

**Решение:**
1. Проверьте формат файла (поддерживаются: CSV, JSON, XML, Excel)
2. Убедитесь, что файл не поврежден
3. Для больших файлов (>10MB) анализируется только первые 10MB (кроме JSON)

### Проблема: AI-помощник не отвечает

**Решение:**
1. Проверьте GEMINI_API_KEY
2. Убедитесь, что у вас есть квота на Gemini API
3. Проверьте консоль браузера на наличие ошибок

### Проблема: ZIP-архив не скачивается

**Решение:**
1. Проверьте, что все шаги пройдены корректно
2. Убедитесь, что пайплайн содержит хотя бы один узел
3. Проверьте консоль браузера на наличие ошибок

---

## 📝 Лицензия

Этот проект развернут на платформе Vercel.

---

## 🤝 Поддержка

Если у вас возникли вопросы или проблемы:

1. Проверьте раздел [Устранение неполадок](#-устранение-неполадок)
2. Откройте Issue на GitHub
3. Свяжитесь с командой разработки

---

## 🎯 Roadmap

- [ ] Поддержка дополнительных источников данных (MongoDB, Redis, S3)
- [ ] Интеграция с dbt для трансформаций
- [ ] Визуализация данных и дашборды
- [ ] Мониторинг и алертинг пайплайнов
- [ ] Версионирование пайплайнов
- [ ] Collaborative editing (совместная работа)
- [ ] CI/CD интеграция
- [ ] Тестирование пайплайнов

---

**Создано с ❤️ =)**
