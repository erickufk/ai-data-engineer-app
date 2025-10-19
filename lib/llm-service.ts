import { GoogleGenAI } from "@google/genai"
import { schemaValidator } from "./schema-validator"

export interface PipelineSpecV1 {
  version: string
  project: { name: string; description: string }
  sources: Array<{
    name: string
    kind: "file" | "postgres" | "clickhouse" | "hdfs" | "kafka"
    entity: string
    format: "csv" | "json" | "xml" | "parquet" | null
    schema: {
      fields: Array<{ name: string; type: string; nullable: boolean }>
      primaryKey: string[]
      timeField: string | null
      encoding: string | null
      timezone: string | null
    }
    notes: string | null
  }>
  transforms: Array<{
    id: string
    operator: "Filter" | "Project" | "Aggregate" | "Join" | "Deduplicate" | "TypeCast" | "DateTrunc" | "UpsertPrep"
    params: Record<string, any>
  }>
  targets: Array<{
    name: string
    kind: "postgres" | "clickhouse" | "hdfs"
    entity: string
    ddl: {
      table: string | null
      partitions: { type: "by_date" | "by_key" | null; field: string | null; granularity: "day" | "month" | null }
      indexes: Array<{ fields: string[]; type: "btree" | "hash" | null }>
      orderBy: string[]
    }
    loadPolicy: {
      mode: "append" | "merge" | "upsert"
      dedupKeys: string[]
      watermark: { field: string | null; delay: string }
    }
  }>
  mappings: Array<{ from: string; to: string; transformId?: string }>
  schedule: {
    frequency: "hourly" | "daily" | "weekly"
    cron: string
    slaNote: string | null
    retries: { count: number; delaySec: number }
  }
  nonFunctional: {
    retention: { policy: string | null }
    dataQualityChecks: Array<{
      check: "not_null" | "unique" | "range"
      field: string
      min?: string | number | null
      max?: string | number | null
    }>
    pii: { masking: string[]; notes: string | null }
  }
}

export interface LLMResponse {
  pipelineSpec: PipelineSpecV1
  reportMarkdown: string
  artifacts: Array<{ path: string; summary: string }>
}

export class LLMService {
  private ai: GoogleGenAI
  private maxRetries = 1 // Added retry limit for validation failures
  private readonly API_TIMEOUT_MS = 45000 // 45 seconds

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables")
    }

    console.log("[v0] Initializing LLM service with Gemini API")

    this.ai = new GoogleGenAI({ apiKey })

    console.log("[v0] LLM service initialized successfully")
  }

  private getSystemPrompt(): string {
    return `You are AI Data Engineer — CSV Analyst.
Your job: from a small CSV sample (≤10 MB) and profiler stats, infer structure, quality, risks, and produce actionable storage & ETL recommendations for our MVP.
Hard constraints
• Analyze only the provided file metadata, header, sample stats, and up to N preview rows. No external lookups, no assumptions beyond the data.
• Do not invent secrets/endpoints; all access details are placeholders set later by the app.
• The assistant does not connect to databases; it recommends target storage and proposes DDL/ETL logic and schedule.
• Respect our defaults: ClickHouse for time-series/analytics, PostgreSQL for operational/upsert workloads, HDFS for raw/archival. Prefer date partitioning when a time field exists; require ORDER BY for ClickHouse targets.
• Acknowledge sampling (≤10 MB): include warnings when confidence is low or distributions look truncated.
Quality
• Be precise, concise, and unambiguous.
• If a critical input is missing, output exactly one clarification line starting with CLARIFY: and still return best-effort results.`
  }

  private getDeveloperPrompt(): string {
    return `Return valid JSON with exact keys below. Do not include extra keys or comments.
{
  "deepProfile": {
    "format": "csv",
    "encoding": "utf-8|...|unknown",
    "delimiter": ",|;|\\t|pipe|unknown",
    "headerPresent": true,
    "schema": {
      "fields": [
        { "name": "string", "type": "int|float|bool|string|date|timestamp", "nullable": true, "example": "string" }
      ],
      "primaryKeyCandidates": [["colA"], ["colA","colB"]],
      "businessKeyCandidates": [["..."]],
      "timeField": "string|null",
      "timezone": "UTC|local|null"
    },
    "quality": {
      "rowCountSampled": 0,
      "missingShareByField": { "field": 0.0 },
      "duplicatesShare": 0.0,
      "mixedTypeFields": ["field"],
      "outlierFields": ["field"],
      "piiFlags": ["email","phone","name","address"]
    },
    "temporal": {
      "granularity": "second|minute|hour|day|null",
      "regularity": "regular|bursty|gapped|null",
      "monotonicIncrease": true
    },
    "categorical": {
      "highCardinality": ["field"],
      "lowCardinality": [{ "field": "status", "top": ["ok","err"] }]
    },
    "sampling": {
      "sampleBytes": 0,
      "originalSizeBytes": 0,
      "schemaConfidence": 0.0,
      "notes": ["first 10MB only", "stats may be biased"]
    }
  },
  "recommendation": {
    "targetStorage": "PostgreSQL|ClickHouse|HDFS",
    "rationale": [
      "short bullet explaining why this storage fits the data"
    ],
    "ddlStrategy": {
      "partitions": { "type": "by_date|by_key|null", "field": "string|null", "granularity": "day|month|null" },
      "orderBy": ["field1","field2"], 
      "indexes": [{ "fields": ["field1","field2"], "type": "btree|hash|null" }]
    },
    "loadPolicy": {
      "mode": "append|merge|upsert",
      "dedupKeys": ["key1","key2"],
      "watermark": { "field": "string|null", "delay": "PT0S|PT1H|P1D" }
    },
    "schedule": { "frequency": "hourly|daily|weekly", "cron": "string", "slaNote": "string|null" },
    "suggestedTransforms": [
      { "operator": "TypeCast", "params": { "field": "value", "toType": "float" } },
      { "operator": "DateTrunc", "params": { "field": "event_time", "granularity": "hour" } },
      { "operator": "Deduplicate", "params": { "keys": ["user_id","event_time"] } },
      { "operator": "Filter", "params": { "expression": "status IN ('ok','pending')" } }
    ]
  },
  "reportMarkdown": "Short Russian report (<=1200 words): цель данных (оперативные/аналитические/сырые), ключевые поля/время, качество и риски (включая предупреждение о сэмпле), обоснование выбора целевой системы (PG/CH/HDFS), DDL-стратегия (партиции/индексы/ORDER BY), логика загрузки (append/merge/upsert + dedup/watermark), расписание, рекомендации по трансформациям и по маскированию PII, альтернативы и trade-offs.",
  "proposedSpec": {
    "version": "1.0",
    "project": { "name": "{{project.name}}", "description": "{{project.description}}" },
    "sources": [
      {
        "name": "csv_input",
        "kind": "file",
        "entity": "{{file.name}}",
        "format": "csv",
        "schema": {
          "fields": [], 
          "primaryKey": [],
          "timeField": "string|null",
          "encoding": "utf-8|...|null",
          "timezone": "UTC|...|null"
        }
      }
    ],
    "transforms": [
      { "id": "f1", "operator": "Filter", "params": { "expression": "…" } },
      { "id": "t1", "operator": "TypeCast", "params": { "field": "…", "toType": "…" } },
      { "id": "d1", "operator": "Deduplicate", "params": { "keys": ["…"] } },
      { "id": "dt1", "operator": "DateTrunc", "params": { "field": "…", "granularity": "…" } }
    ],
    "targets": [
      {
        "name": "target_main",
        "kind": "postgres|clickhouse|hdfs",
        "entity": "table|path",
        "ddl": {
          "table": "schema.table|null",
          "partitions": { "type": "by_date|by_key|null", "field": "string|null", "granularity": "day|month|null" },
          "indexes": [{ "fields": ["…"], "type": "btree|hash|null" }],
          "orderBy": ["…"]
        },
        "loadPolicy": {
          "mode": "append|merge|upsert",
          "dedupKeys": ["…"],
          "watermark": { "field": "string|null", "delay": "PT0S" }
        }
      }
    ],
    "mappings": [{ "from": "csv_input.field", "to": "target.field", "transformId": "t1" }],
    "schedule": { "frequency": "hourly|daily|weekly", "cron": "…", "slaNote": "…", "retries": { "count": 2, "delaySec": 300 } },
    "nonFunctional": {
      "retention": { "policy": null },
      "dataQualityChecks": [{ "check": "not_null", "field": "…" }, { "check": "unique", "field": "…" }],
      "pii": { "masking": ["email","phone"], "notes": "маскируйте PII в целевой системе" }
    }
  }
}
Rules
• If targetStorage="ClickHouse" then ddlStrategy.orderBy must be non-empty.
• If loadPolicy.mode is merge or upsert, dedupKeys must be non-empty.
• If ddlStrategy.partitions.type="by_date", a valid timeField must be present.
• Keep reportMarkdown in Russian.
• Do not exceed 1200 words in reportMarkdown.`
  }

  private buildUserPromptTemplate(fileProfile: any, projectMeta: any): string {
    return `PROJECT:
- name: ${projectMeta.name}
- description: ${projectMeta.description}

FILE PROFILE (CSV):
- name: ${fileProfile.name}
- sizeBytes: ${fileProfile.sampleInfo?.originalSizeBytes || 0}
- sampledBytes: ${fileProfile.sampleInfo?.sampleBytes || 0}   // first 10 MB max
- encoding: ${fileProfile.encoding || "utf-8"}
- delimiter: ${fileProfile.delimiter || ","}
- headerPresent: ${fileProfile.headerPresent || true}
- columns: ${JSON.stringify(
      fileProfile.columns?.map((col: string, index: number) => ({
        name: col,
        typeGuess: fileProfile.inferredTypes?.[col] || "string",
        nullableGuess: true,
        examples:
          fileProfile.sampleData
            ?.slice(0, 3)
            .map((row: any) => row[index])
            .filter(Boolean) || [],
      })) || [],
    )}
- inferredTypes: ${JSON.stringify(fileProfile.inferredTypes || {})}
- timeFieldCandidates: ${JSON.stringify(fileProfile.timeFields || [])}
- missingStats: ${JSON.stringify(fileProfile.missingStats || {})} // per field (sample)
- duplicatesShare: ${fileProfile.duplicatesShare || 0}
- sampleRowsPreview: ${JSON.stringify(fileProfile.sampleData?.slice(0, 50) || [])} // optional, truncated

CONTEXT:
- We only analyzed the first 10 MB; sampling bias is possible.
- Follow platform defaults: ClickHouse for analytics/time-series; PostgreSQL for operational/upsert; HDFS for raw.
- No secrets or live connections — only recommendations and a proposed spec.

TASK:
1) Build a comprehensive "deepProfile" of this CSV sample.
2) Recommend the best target storage and ETL approach with clear rationale.
3) Propose a concise set of transforms (Filter/TypeCast/DateTrunc/Deduplicate/KeyPrep) and a safe schedule.
4) Return a short Russian report with risks/alternatives.
5) Produce a minimal consistent "proposedSpec" (PipelineSpec v1 subset) suitable for templating artifacts.

OUTPUT:
Return JSON exactly per the Developer Prompt schema above.
If a critical ambiguity exists, start with one line: CLARIFY: <your question here>
and still provide best-effort results.`
  }

  private buildUserPrompt(input: {
    projectMeta: any
    ingest: any
    recommendation: any
    pipeline: any
  }): string {
    const { projectMeta, ingest, recommendation, pipeline } = input

    if (ingest.fileProfile) {
      return this.buildUserPromptTemplate(ingest.fileProfile, projectMeta)
    }

    // Fallback to original format for constructor mode
    return `PROJECT:
- name: ${projectMeta.name}
- description: ${projectMeta.description}

INGEST:
- mode: ${ingest.mode}
- fileProfile: ${ingest.fileProfile ? JSON.stringify(ingest.fileProfile) : "null"}
- constructorSpec: ${ingest.constructorSpec ? JSON.stringify(ingest.constructorSpec) : "null"}

RECOMMENDATION:
- storage: ${recommendation.storage}
- partitioning: ${recommendation.partitioning}
- loadMode: ${recommendation.loadMode}
- schedule: ${JSON.stringify(recommendation.schedule)}

PIPELINE CANVAS:
- nodes: ${JSON.stringify(pipeline.nodes)}
- edges: ${JSON.stringify(pipeline.edges)}

TASK:
Produce a consistent "pipelineSpec" and "reportMarkdown" and list "artifacts" per developer instructions. 
Language: Russian. If anything critical is missing, output one line starting with "CLARIFY:" and proceed with best assumptions.`
  }

  private cleanJsonResponse(jsonString: string): string {
    console.log("[v0] Cleaning JSON response before parsing")

    let cleaned = jsonString

    // Fix common escape sequence issues
    // Replace invalid escape sequences with valid ones
    cleaned = cleaned
      // Fix backslash followed by invalid characters
      .replace(/\\([^"\\/bfnrtu])/g, "\\\\$1")
      // Remove control characters (except valid JSON whitespace)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Fix unescaped quotes in strings (basic heuristic)
      .replace(/([^\\])"([^"]*[^\\])"([^,}\]])/g, '$1\\"$2\\"$3')

    return cleaned
  }

  private async callLLM(input: any, validationErrors: string[] = []): Promise<any> {
    console.log("[v0] Preparing LLM prompts with three-prompt structure")

    const systemPrompt = this.getSystemPrompt()
    const developerPrompt = this.getDeveloperPrompt()
    let userPrompt = this.buildUserPrompt(input)

    if (validationErrors.length > 0) {
      console.log("[v0] Adding validation error context for retry")
      const errorPrompt = schemaValidator.generateValidationErrorPrompt(validationErrors, [])
      userPrompt = errorPrompt + "\n\nOriginal request:\n" + userPrompt
    }

    console.log("[v0] Calling Gemini API with structured prompts")

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log("[v0] API call timeout, aborting request")
        controller.abort()
      }, this.API_TIMEOUT_MS)

      const response = await this.ai.models.generateContent(
        {
          model: "gemini-2.0-flash-001",
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt }],
            },
            {
              role: "model",
              parts: [
                {
                  text: "I understand. I am AI Data Engineer — CSV Analyst, ready to analyze file samples and provide storage & ETL recommendations.",
                },
              ],
            },
            {
              role: "user",
              parts: [{ text: developerPrompt }],
            },
            {
              role: "model",
              parts: [{ text: "I understand the required JSON output format and will follow it exactly." }],
            },
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
        },
        {
          // @ts-ignore - signal is supported but not in types
          signal: controller.signal,
        },
      )

      clearTimeout(timeoutId)

      const responseText = response.text

      console.log("[v0] Gemini API response received, length:", responseText.length)

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("[v0] No valid JSON found in response")
        console.error("[v0] Response preview:", responseText.substring(0, 500))
        throw new Error("No valid JSON found in LLM response")
      }

      console.log("[v0] JSON found in response, parsing...")

      try {
        const cleanedJson = this.cleanJsonResponse(jsonMatch[0])
        const parsed = JSON.parse(cleanedJson)

        if (!parsed.deepProfile || !parsed.recommendation || !parsed.reportMarkdown || !parsed.proposedSpec) {
          console.error("[v0] Missing required fields in parsed response")
          console.error("[v0] Available fields:", Object.keys(parsed))
          throw new Error("Missing required fields in LLM response")
        }

        console.log("[v0] LLM response parsed successfully")

        return parsed
      } catch (parseError) {
        console.log("[v0] Primary JSON parser failed, trying alternative method...")
        console.log("[v0] Parse error details:", parseError)

        try {
          console.log("[v0] Attempting alternative JSON parsing with aggressive sanitization")
          // Remove all control characters and try again
          const sanitized = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, "")
          const parsed = JSON.parse(sanitized)

          if (!parsed.deepProfile || !parsed.recommendation || !parsed.reportMarkdown || !parsed.proposedSpec) {
            throw new Error("Missing required fields in LLM response")
          }

          console.log("[v0] Alternative parsing succeeded ✓")
          return parsed
        } catch (altError) {
          console.error("[v0] All JSON parsing methods failed")
          console.error("[v0] Primary error:", parseError)
          console.error("[v0] Alternative error:", altError)
          console.error("[v0] JSON preview:", jsonMatch[0].substring(0, 500))
          throw new Error(`Failed to parse LLM response: ${parseError}`)
        }
      }
    } catch (apiError: any) {
      if (apiError.name === "AbortError") {
        console.error("[v0] Gemini API call timed out after", this.API_TIMEOUT_MS, "ms")
        throw new Error(`API timeout: Request exceeded ${this.API_TIMEOUT_MS / 1000} seconds`)
      }
      console.error("[v0] Gemini API call failed:", apiError)
      throw apiError
    }
  }

  async analyzeFile(fileProfile: any, projectMeta: any): Promise<any> {
    console.log("[v0] Starting file analysis with enhanced prompts")

    const input = {
      projectMeta,
      ingest: { fileProfile, mode: "file" },
      recommendation: {},
      pipeline: { nodes: [], edges: [] },
    }

    try {
      const result = await this.callLLM(input)
      console.log("[v0] File analysis completed successfully")

      if (result.deepProfile && result.deepProfile.quality) {
        const actualRowCount = fileProfile.sampleRowsCount || 0
        if (!result.deepProfile.quality.rowCountSampled || result.deepProfile.quality.rowCountSampled === 0) {
          console.log(`[v0] Populating rowCountSampled with actual value: ${actualRowCount}`)
          result.deepProfile.quality.rowCountSampled = actualRowCount
        }
      }

      return result
    } catch (error: any) {
      console.error("[v0] File analysis failed:", error)

      if (error.message?.includes("timeout")) {
        console.log("[v0] Returning fallback response due to timeout")
        return this.createFallbackAnalysisResponse(fileProfile, projectMeta, "Analysis timed out")
      }

      throw error
    }
  }

  private createFallbackAnalysisResponse(fileProfile: any, projectMeta: any, errorReason: string): any {
    console.log("[v0] Creating fallback analysis response")

    return {
      deepProfile: {
        format: fileProfile.format || "csv",
        encoding: fileProfile.encoding || "utf-8",
        delimiter: fileProfile.delimiter || ",",
        headerPresent: fileProfile.headerPresent ?? true,
        schema: {
          fields:
            fileProfile.columns?.map((col: string) => ({
              name: col,
              type: fileProfile.inferredTypes?.[col] || "string",
              nullable: true,
              example: "",
            })) || [],
          primaryKeyCandidates: fileProfile.primaryKeyCandidates || [],
          businessKeyCandidates: [],
          timeField: fileProfile.timeFields?.[0] || null,
          timezone: "UTC",
        },
        quality: {
          rowCountSampled: fileProfile.sampleRowsCount || 0,
          missingShareByField: fileProfile.missingStats || {},
          duplicatesShare: fileProfile.duplicatesShare || 0,
          mixedTypeFields: [],
          outlierFields: [],
          piiFlags: [],
        },
        temporal: {
          granularity: null,
          regularity: null,
          monotonicIncrease: false,
        },
        categorical: {
          highCardinality: [],
          lowCardinality: [],
        },
        sampling: {
          sampleBytes: fileProfile.sampleInfo?.sampledBytes || 0,
          originalSizeBytes: fileProfile.sampleInfo?.originalSize || 0,
          schemaConfidence: fileProfile.schemaConfidence || 0.7,
          notes: [errorReason, "Используется базовый профиль без LLM анализа"],
        },
      },
      recommendation: {
        targetStorage: "PostgreSQL",
        rationale: [
          "Базовая рекомендация: PostgreSQL подходит для большинства операционных задач",
          "Для точных рекомендаций требуется полный анализ данных",
        ],
        ddlStrategy: {
          partitions: { type: null, field: null, granularity: null },
          orderBy: [],
          indexes: [],
        },
        loadPolicy: {
          mode: "append",
          dedupKeys: [],
          watermark: { field: null, delay: "PT0S" },
        },
        schedule: {
          frequency: "daily",
          cron: "0 2 * * *",
          slaNote: null,
        },
        suggestedTransforms: [],
      },
      reportMarkdown: `# Базовый анализ файла: ${projectMeta.name}

## ⚠️ Ограничение анализа

${errorReason}. Представлен базовый профиль данных без детального LLM анализа.

## Обнаруженная структура

- **Формат**: ${fileProfile.format || "csv"}
- **Полей**: ${fileProfile.columns?.length || 0}
- **Строк**: ${fileProfile.sampleRowsCount || 0}
- **Кодировка**: ${fileProfile.encoding || "utf-8"}

## Рекомендации

Для получения детальных рекомендаций по хранению и обработке данных:
1. Попробуйте повторить анализ
2. Убедитесь в стабильности сетевого подключения
3. Рассмотрите уменьшение размера выборки данных

*Базовый отчет сгенерирован автоматически*`,
      proposedSpec: this.createFallbackSpec({
        projectMeta,
        ingest: { fileProfile, mode: "file" },
        recommendation: { storage: "PostgreSQL", loadMode: "append" },
        pipeline: { nodes: [], edges: [] },
      }),
    }
  }

  private createFallbackSpec(input: any): PipelineSpecV1 {
    const { projectMeta, ingest, recommendation, pipeline } = input

    return {
      version: "1.0",
      project: {
        name: projectMeta.name,
        description: projectMeta.description,
      },
      sources: [
        {
          name: "source_data",
          kind: ingest.mode === "file" ? "file" : "postgres",
          entity: ingest.mode === "file" ? "data.csv" : "source_table",
          format: ingest.fileProfile?.format || "csv",
          schema: {
            fields:
              ingest.fileProfile?.columns?.map((col: string) => ({
                name: col,
                type: ingest.fileProfile.inferredTypes?.[col] || "string",
                nullable: true,
              })) || [],
            primaryKey: [],
            timeField: ingest.fileProfile?.timeFields?.[0] || null,
            encoding: "utf8",
            timezone: "UTC",
          },
          notes: null,
        },
      ],
      transforms:
        pipeline.nodes
          ?.filter((node: any) => node.type === "transform")
          ?.map((node: any) => ({
            id: node.id,
            operator: node.operator || "Filter",
            params: node.config || {},
          })) || [],
      targets: [
        {
          name: "target_data",
          kind: recommendation.storage?.toLowerCase() || "postgres",
          entity: "target_table",
          ddl: {
            table: "target_table",
            partitions: {
              type: recommendation.partitioning === "by_date" ? "by_date" : null,
              field: ingest.fileProfile?.timeFields?.[0] || null,
              granularity: "day",
            },
            indexes: [],
            orderBy: recommendation.storage === "ClickHouse" ? ["id"] : [],
          },
          loadPolicy: {
            mode: recommendation.loadMode || "append",
            dedupKeys: [],
            watermark: { field: null, delay: "PT0S" },
          },
        },
      ],
      mappings: [],
      schedule: {
        frequency: recommendation.schedule?.frequency || "daily",
        cron: recommendation.schedule?.cron || "0 2 * * *",
        slaNote: null,
        retries: { count: 2, delaySec: 300 },
      },
      nonFunctional: {
        retention: { policy: null },
        dataQualityChecks: [],
        pii: { masking: [], notes: null },
      },
    }
  }

  private createFallbackReport(input: any): string {
    const { projectMeta, recommendation, ingest } = input

    const samplingWarning = ingest.fileProfile?.samplingWarning
      ? `

## ⚠️ Ограничения анализа данных

Данный анализ основан на выборке из ${ingest.fileProfile.sampleInfo?.percent.toFixed(1)}% файла (${this.formatFileSize(ingest.fileProfile.sampleInfo?.sampledBytes)} из ${this.formatFileSize(ingest.fileProfile.sampleInfo?.originalSize)}).

**Рекомендации:**
- Выполните валидацию на полном датасете перед продакшеном
- Проверьте редкие значения и крайние случаи
- Рассмотрите использование Great Expectations для контроля качества данных
- Настройте мониторинг схемы данных в продакшене

`
      : ""

    return `# Отчет по проекту: ${projectMeta.name}

## Обзор
${projectMeta.description}
${samplingWarning}
## Рекомендуемая архитектура
- **Хранилище:** ${recommendation.storage}
- **Режим загрузки:** ${recommendation.loadMode}
- **Расписание:** ${recommendation.schedule?.frequency}

## Обоснование выбора
${recommendation.rationale?.join("\n- ") || "Выбор основан на характеристиках данных и требованиях к производительности."}

## Следующие шаги
1. Настроить окружение согласно README.md
2. Выполнить DDL скрипты
3. Развернуть Airflow DAG
4. Запустить пайплайн
${ingest.fileProfile?.samplingWarning ? "5. Провести валидацию на полном датасете" : ""}

*Отчет сгенерирован автоматически*`
  }

  private createFallbackArtifacts(input: any): Array<{ path: string; summary: string }> {
    const { recommendation } = input
    const storage = recommendation.storage?.toLowerCase() || "postgres"

    return [
      { path: `/ddl/create_tables_${storage}.sql`, summary: `DDL для ${recommendation.storage}` },
      { path: "/etl/dag_pipeline.py", summary: "Airflow DAG для ETL процесса" },
      { path: "/config/pipeline.yaml", summary: "Конфигурация пайплайна" },
      { path: "/config/.env.sample", summary: "Шаблон переменных окружения" },
      { path: "/scripts/run.sh", summary: "Скрипт запуска" },
      { path: "/docs/README.md", summary: "Инструкция по установке и запуску" },
      { path: "/docs/schedule.md", summary: "Настройки расписания и мониторинга" },
      { path: "/docs/design_report.md", summary: "Техническое обоснование архитектуры" },
    ]
  }

  private formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  async generatePipelineSpec(input: {
    projectMeta: any
    ingest: any
    recommendation: any
    pipeline: any
  }): Promise<LLMResponse> {
    console.log("[v0] Starting pipeline spec generation")

    const compressedInput = this.compressFileProfile(input)
    console.log(
      "[v0] Input compressed, file profile size:",
      compressedInput.ingest.fileProfile?.sampleData?.length || 0,
    )

    let attempt = 0
    let lastError: string[] = []

    while (attempt <= this.maxRetries) {
      try {
        console.log(`[v0] Attempt ${attempt + 1} of ${this.maxRetries + 1}`)

        const response = await this.callLLM(compressedInput, lastError)
        console.log("[v0] LLM call completed, validating response")

        const validation = schemaValidator.validatePipelineSpec(response.pipelineSpec)

        if (validation.isValid) {
          console.log("[v0] Validation passed successfully")
          // Add warnings to report if present
          if (validation.warnings.length > 0) {
            console.log("[v0] Validation warnings:", validation.warnings)
            response.reportMarkdown +=
              "\n\n## ⚠️ Предупреждения\n\n" + validation.warnings.map((w) => `- ${w}`).join("\n")
          }
          return response
        }

        // If validation failed and we have retries left
        if (attempt < this.maxRetries) {
          console.log(`[v0] Validation failed on attempt ${attempt + 1}, retrying...`)
          console.log("[v0] Validation errors:", validation.errors)
          lastError = validation.errors
          attempt++
          continue
        }

        // Final attempt failed, return fallback
        console.log(`[v0] All attempts failed, using fallback response`)
        console.log("[v0] Final validation errors:", validation.errors)
        return this.createFallbackResponse(compressedInput, validation.errors)
      } catch (error) {
        console.error(`[v0] LLM call failed on attempt ${attempt + 1}:`, error)

        if (attempt < this.maxRetries) {
          attempt++
          continue
        }

        // All attempts failed, return fallback
        console.log("[v0] All LLM attempts failed, using fallback")
        return this.createFallbackResponse(compressedInput, [`LLM call failed: ${error}`])
      }
    }

    // Should never reach here, but return fallback as safety
    console.log("[v0] Unexpected code path, returning fallback")
    return this.createFallbackResponse(compressedInput, ["Maximum retries exceeded"])
  }

  private compressFileProfile(input: any): any {
    if (!input.ingest.fileProfile) return input

    const profile = input.ingest.fileProfile
    const compressed = {
      ...input,
      ingest: {
        ...input.ingest,
        fileProfile: {
          ...profile,
          // Limit sample data to first 200-500 rows
          sampleData: profile.sampleData?.slice(0, 300) || [],
          sampleRowsCount: Math.min(profile.sampleRowsCount || 0, 300),
          // Keep essential metadata
          columns: profile.columns,
          inferredTypes: profile.inferredTypes,
          timeFields: profile.timeFields,
          format: profile.format,
          sampleInfo: profile.sampleInfo,
          samplingWarning: profile.samplingWarning,
          schemaConfidence: profile.schemaConfidence,
        },
      },
    }

    return compressed
  }

  private createFallbackResponse(input: any, errors: string[]): LLMResponse {
    console.log(`[v0] Creating fallback response due to errors:`, errors)

    return {
      pipelineSpec: this.createFallbackSpec(input),
      reportMarkdown:
        this.createFallbackReport(input) +
        "\n\n## ⚠️ Системное уведомление\n\nДанная спецификация была сгенерирована в резервном режиме из-за ошибок валидации. " +
        "Рекомендуется проверить конфигурацию вручную.\n\n" +
        "Ошибки:\n" +
        errors.map((e) => `- ${e}`).join("\n"),
      artifacts: this.createFallbackArtifacts(input),
    }
  }
}

export const llmService = new LLMService()
