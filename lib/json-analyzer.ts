export interface JSONAnalysisResult {
  schema: JSONSchema
  samples: any[]
  totalRecords: number
  fileSize: number
  structure: "array" | "object" | "nested"
  estimatedFields: number
}

export interface JSONSchema {
  type: string
  properties?: Record<string, JSONFieldSchema>
  items?: JSONFieldSchema
}

export interface JSONFieldSchema {
  type: string
  format?: string
  examples: any[]
  nullable: boolean
  nested?: JSONSchema
}

export class JSONAnalyzer {
  private maxSamples = 50 // Максимум образцов для LLM
  private maxDepth = 10 // Максимальная глубина анализа

  /**
   * Анализирует JSON файл и возвращает структуру + образцы
   */
  analyzeJSON(jsonContent: string): JSONAnalysisResult {
    try {
      const data = JSON.parse(jsonContent)
      const fileSize = new Blob([jsonContent]).size

      if (Array.isArray(data)) {
        return this.analyzeArray(data, fileSize)
      } else if (typeof data === "object" && data !== null) {
        return this.analyzeObject(data, fileSize)
      } else {
        throw new Error("JSON должен содержать объект или массив")
      }
    } catch (error) {
      throw new Error(`Ошибка парсинга JSON: ${error.message}`)
    }
  }

  private analyzeArray(data: any[], fileSize: number): JSONAnalysisResult {
    const totalRecords = data.length
    const samples = this.sampleArray(data)
    const schema = this.inferArraySchema(data)

    return {
      schema,
      samples,
      totalRecords,
      fileSize,
      structure: "array",
      estimatedFields: this.countFields(schema),
    }
  }

  private analyzeObject(data: object, fileSize: number): JSONAnalysisResult {
    const schema = this.inferObjectSchema(data)
    const samples = [data] // Для объекта берем весь объект как образец

    return {
      schema,
      samples,
      totalRecords: 1,
      fileSize,
      structure: "object",
      estimatedFields: this.countFields(schema),
    }
  }

  /**
   * Умное сэмплирование массива - берем образцы из разных частей
   */
  private sampleArray(data: any[]): any[] {
    if (data.length <= this.maxSamples) {
      return data
    }

    const samples: any[] = []
    const step = Math.floor(data.length / this.maxSamples)

    // Берем образцы равномерно по всему массиву
    for (let i = 0; i < this.maxSamples; i++) {
      const index = Math.min(i * step, data.length - 1)
      samples.push(data[index])
    }

    // Всегда включаем первый и последний элементы
    if (!samples.includes(data[0])) {
      samples[0] = data[0]
    }
    if (!samples.includes(data[data.length - 1])) {
      samples[samples.length - 1] = data[data.length - 1]
    }

    return samples
  }

  /**
   * Определяет схему массива на основе всех элементов
   */
  private inferArraySchema(data: any[]): JSONSchema {
    if (data.length === 0) {
      return { type: "array", items: { type: "unknown", examples: [], nullable: true } }
    }

    // Анализируем все элементы для определения общей схемы
    const itemSchemas = data.slice(0, 1000).map((item) => this.inferValueSchema(item)) // Ограничиваем анализ первой 1000 записей
    const mergedSchema = this.mergeSchemas(itemSchemas)

    return {
      type: "array",
      items: mergedSchema,
    }
  }

  /**
   * Определяет схему объекта
   */
  private inferObjectSchema(data: object, depth = 0): JSONSchema {
    if (depth > this.maxDepth) {
      return { type: "object", properties: {} }
    }

    const properties: Record<string, JSONFieldSchema> = {}

    for (const [key, value] of Object.entries(data)) {
      properties[key] = this.inferValueSchema(value, depth + 1)
    }

    return {
      type: "object",
      properties,
    }
  }

  /**
   * Определяет схему значения
   */
  private inferValueSchema(value: any, depth = 0): JSONFieldSchema {
    if (value === null || value === undefined) {
      return { type: "null", examples: [value], nullable: true }
    }

    const type = Array.isArray(value) ? "array" : typeof value
    const examples = [value]

    switch (type) {
      case "string":
        return {
          type: "string",
          format: this.inferStringFormat(value),
          examples: [value],
          nullable: false,
        }

      case "number":
        return {
          type: Number.isInteger(value) ? "integer" : "number",
          examples: [value],
          nullable: false,
        }

      case "boolean":
        return {
          type: "boolean",
          examples: [value],
          nullable: false,
        }

      case "array":
        return {
          type: "array",
          examples: [value.slice(0, 3)], // Показываем только первые 3 элемента в примере
          nullable: false,
          nested: value.length > 0 ? this.inferArraySchema(value) : undefined,
        }

      case "object":
        return {
          type: "object",
          examples: [value],
          nullable: false,
          nested: depth < this.maxDepth ? this.inferObjectSchema(value, depth) : undefined,
        }

      default:
        return {
          type: "unknown",
          examples: [value],
          nullable: false,
        }
    }
  }

  /**
   * Определяет формат строки (дата, email, url и т.д.)
   */
  private inferStringFormat(value: string): string | undefined {
    // ISO дата
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return "date-time"
    }

    // Дата
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return "date"
    }

    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "email"
    }

    // URL
    if (/^https?:\/\//.test(value)) {
      return "url"
    }

    // UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return "uuid"
    }

    return undefined
  }

  /**
   * Объединяет несколько схем в одну (для массивов с разнородными элементами)
   */
  private mergeSchemas(schemas: JSONFieldSchema[]): JSONFieldSchema {
    if (schemas.length === 0) {
      return { type: "unknown", examples: [], nullable: true }
    }

    if (schemas.length === 1) {
      return schemas[0]
    }

    // Определяем наиболее частый тип
    const typeCounts = schemas.reduce(
      (acc, schema) => {
        acc[schema.type] = (acc[schema.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const mostCommonType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0][0]

    // Собираем все примеры
    const allExamples = schemas.flatMap((s) => s.examples).slice(0, 10)

    // Проверяем, есть ли nullable значения
    const nullable = schemas.some((s) => s.nullable)

    return {
      type: mostCommonType,
      examples: allExamples,
      nullable,
      format: schemas.find((s) => s.format)?.format,
    }
  }

  /**
   * Подсчитывает общее количество полей в схеме
   */
  private countFields(schema: JSONSchema): number {
    let count = 0

    if (schema.properties) {
      count += Object.keys(schema.properties).length

      // Рекурсивно считаем вложенные поля
      for (const prop of Object.values(schema.properties)) {
        if (prop.nested) {
          count += this.countFields(prop.nested)
        }
      }
    }

    if (schema.items && schema.items.nested) {
      count += this.countFields(schema.items.nested)
    }

    return count
  }

  /**
   * Создает краткое описание для LLM
   */
  createLLMPayload(analysis: JSONAnalysisResult): {
    schema: JSONSchema
    samples: any[]
    metadata: {
      totalRecords: number
      structure: string
      estimatedFields: number
      fileSize: string
    }
  } {
    return {
      schema: analysis.schema,
      samples: analysis.samples,
      metadata: {
        totalRecords: analysis.totalRecords,
        structure: analysis.structure,
        estimatedFields: analysis.estimatedFields,
        fileSize: this.formatFileSize(analysis.fileSize),
      },
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

// Экспортируем singleton
export const jsonAnalyzer = new JSONAnalyzer()
