import { type NextRequest, NextResponse } from "next/server"
import { jsonAnalyzer } from "@/lib/json-analyzer"
import { llmService } from "@/lib/llm-service"

export const maxDuration = 60 // 60 seconds for Pro plan, allows time for file upload + LLM analysis

const MAX_PROFILE_BYTES = 10 * 1024 * 1024 // 10MB
const CSV_MAX_ROWS = 1000
const JSON_MAX_OBJS = 1000
const XML_MAX_RECORDS = 500
const FILE_SAMPLE_PERCENT = 0.1 // Read only first 10% of file for analysis

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const projectData = formData.get("project")
    const originalSize = Number.parseInt(formData.get("originalSize") as string) || file.size
    const sampledBytes = Number.parseInt(formData.get("sampledBytes") as string) || file.size
    const isFullFile = formData.get("isFullFile") === "true"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    let projectMeta = { name: "File Analysis Project", description: "Automated file analysis for data pipeline" }
    if (projectData) {
      try {
        projectMeta = JSON.parse(projectData as string)
      } catch (error) {
        console.log("[v0] Failed to parse project data, using defaults")
      }
    }

    const allowedTypes = ["text/csv", "application/json", "text/xml", "application/xml"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const MAX_FILE_SIZE = file.type === "application/json" ? 100 * 1024 * 1024 : 5 * 1024 * 1024 * 1024 // 100MB for JSON, 5GB for others
    if (originalSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: file.type === "application/json" ? "JSON file too large (max 100MB)" : "File too large (max 5GB)",
        },
        { status: 400 },
      )
    }

    const sampleInfo = {
      originalSize,
      sampledBytes,
      percent: (sampledBytes / originalSize) * 100,
      isFullFile,
    }

    let text: string
    let detectedEncoding = "utf-8"

    try {
      const buffer = await file.arrayBuffer()
      const fullSize = buffer.byteLength
      const sampleSize = Math.min(fullSize, Math.ceil(fullSize * FILE_SAMPLE_PERCENT))

      console.log(
        `[v0] File size: ${fullSize} bytes, sampling: ${sampleSize} bytes (${((sampleSize / fullSize) * 100).toFixed(1)}%)`,
      )

      // Only process the first 10% of the file
      const uint8Array = new Uint8Array(buffer, 0, sampleSize)

      if (uint8Array.length >= 3 && uint8Array[0] === 0xef && uint8Array[1] === 0xbb && uint8Array[2] === 0xbf) {
        detectedEncoding = "utf-8-bom"
        text = new TextDecoder("utf-8").decode(uint8Array.slice(3))
      } else if (uint8Array.length >= 2 && uint8Array[0] === 0xff && uint8Array[1] === 0xfe) {
        detectedEncoding = "utf-16le"
        text = new TextDecoder("utf-16le").decode(uint8Array.slice(2))
      } else if (uint8Array.length >= 2 && uint8Array[0] === 0xfe && uint8Array[1] === 0xff) {
        detectedEncoding = "utf-16be"
        text = new TextDecoder("utf-16be").decode(uint8Array.slice(2))
      } else {
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(uint8Array)
          detectedEncoding = "utf-8"
        } catch {
          text = new TextDecoder("latin1").decode(uint8Array)
          detectedEncoding = "latin1"
        }
      }
    } catch (error) {
      const fullText = await file.text()
      const sampleLength = Math.ceil(fullText.length * FILE_SAMPLE_PERCENT)
      text = fullText.substring(0, sampleLength)
      console.log(`[v0] Fallback text reading: ${fullText.length} chars, sampling: ${sampleLength} chars`)
    }

    let fileProfile

    if (file.type === "text/csv") {
      fileProfile = await profileCSV(text, sampleInfo, detectedEncoding)
    } else if (file.type === "application/json") {
      fileProfile = await profileJSONWithAnalyzer(text, sampleInfo, detectedEncoding, isFullFile)
    } else {
      fileProfile = await profileXML(text, sampleInfo, detectedEncoding)
    }

    if (fileProfile && (file.type === "text/csv" || file.type === "application/json")) {
      try {
        console.log("[v0] Starting enhanced LLM analysis")

        const enhancedProfile = {
          ...fileProfile,
          name: file.name,
          sampleData: extractSampleData(text, file.type, 50), // Extract first 50 rows for LLM
        }

        const llmAnalysis = await llmService.analyzeFile(enhancedProfile, projectMeta)

        console.log("[v0] LLM analysis completed successfully")

        // Return the enhanced analysis result
        return NextResponse.json({
          deepProfile: llmAnalysis.deepProfile,
          recommendation: llmAnalysis.recommendation,
          reportMarkdown: llmAnalysis.reportMarkdown,
          proposedSpec: llmAnalysis.proposedSpec,
          // Include original fileProfile for backward compatibility
          fileProfile: fileProfile,
        })
      } catch (llmError) {
        console.error("[v0] LLM analysis failed, returning basic profile:", llmError)

        return NextResponse.json({
          deepProfile: {
            format: fileProfile.format,
            encoding: fileProfile.encoding,
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
              notes: ["LLM analysis failed, using basic profile"],
            },
          },
          recommendation: {
            targetStorage: "PostgreSQL",
            rationale: ["Базовая рекомендация без LLM анализа"],
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
          reportMarkdown: "# Базовый анализ\n\nLLM анализ недоступен. Используется базовый профиль данных.",
          proposedSpec: null,
          fileProfile: fileProfile,
          error: llmError instanceof Error ? llmError.message : "LLM analysis failed",
        })
      }
    }

    return NextResponse.json({
      fileProfile,
      error: "LLM analysis not available for this file type",
    })
  } catch (error) {
    console.error("Profile API Error:", error)
    return NextResponse.json({ error: "Failed to profile file" }, { status: 500 })
  }
}

function extractSampleData(text: string, fileType: string, maxRows = 50): any[] {
  try {
    if (fileType === "text/csv") {
      const lines = text.split("\n").slice(0, maxRows + 1) // +1 for header
      if (lines.length < 2) return []

      const delimiter = detectCSVDelimiter(lines[0])
      const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/"/g, ""))

      return lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(delimiter).map((v) => v.trim().replace(/"/g, ""))
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ""
          })
          return row
        })
        .slice(0, maxRows)
    } else if (fileType === "application/json") {
      const trimmedText = text.trim()
      let items: any[] = []

      if (trimmedText.includes("\n") && !trimmedText.startsWith("[")) {
        // NDJSON format
        const lines = text
          .split("\n")
          .filter((line) => line.trim())
          .slice(0, maxRows)
        items = lines
          .map((line) => {
            try {
              return JSON.parse(line)
            } catch {
              return null
            }
          })
          .filter((item) => item !== null)
      } else {
        // Regular JSON
        const data = JSON.parse(text)
        items = Array.isArray(data) ? data.slice(0, maxRows) : [data]
      }

      return items
    }
  } catch (error) {
    console.error("[v0] Failed to extract sample data:", error)
  }

  return []
}

function detectCSVDelimiter(headerLine: string): string {
  const delimiters = [",", ";", "\t", "|"]
  let bestDelimiter = ","
  let maxColumns = 0

  for (const delimiter of delimiters) {
    const columns = headerLine.split(delimiter).length
    if (columns > maxColumns) {
      maxColumns = columns
      bestDelimiter = delimiter
    }
  }

  return bestDelimiter
}

async function profileJSONWithAnalyzer(text: string, sampleInfo: any, encoding: string, isFullFile = false) {
  try {
    console.log("[v0] Starting JSON analysis with new analyzer")

    const analysis = jsonAnalyzer.analyzeJSON(text)
    console.log("[v0] JSON analysis completed:", {
      totalRecords: analysis.totalRecords,
      structure: analysis.structure,
      estimatedFields: analysis.estimatedFields,
      samplesCount: analysis.samples.length,
    })

    const columns = extractColumnsFromSchema(analysis.schema)

    const inferredTypes: Record<string, string> = {}
    const missingStats: Record<string, number> = {}
    const timeFields: string[] = []
    const primaryKeyCandidates: string[] = []
    const qualityStats: Record<string, any> = {}

    columns.forEach((col) => {
      const fieldSchema = getFieldSchema(analysis.schema, col)

      if (fieldSchema) {
        inferredTypes[col] = mapSchemaTypeToInferredType(fieldSchema.type, fieldSchema.format)

        if (
          fieldSchema.format === "date-time" ||
          fieldSchema.format === "date" ||
          /^(time|date|timestamp|created|updated|modified)(_at|_on)?$/i.test(col)
        ) {
          timeFields.push(col)
        }

        const values = analysis.samples
          .map((item) => (typeof item === "object" && item !== null ? item[col] : undefined))
          .filter((v) => v !== undefined && v !== null)

        const uniqueValues = new Set(values)
        const uniqueness = uniqueValues.size / Math.max(values.length, 1)
        const presence = values.length / Math.max(analysis.samples.length, 1)

        if (presence > 0.98 && uniqueness > 0.98) {
          primaryKeyCandidates.push(col)
        }

        qualityStats[col] = {
          notNull: presence,
          unique: uniqueness,
          range:
            fieldSchema.type === "integer" || fieldSchema.type === "number"
              ? calculateRange(values.filter((v) => typeof v === "number"))
              : null,
        }

        missingStats[col] = analysis.samples.length - values.length
      }
    })

    console.log("[v0] JSON profiling completed successfully")

    return {
      format: analysis.structure === "array" ? "json" : ("json-object" as const),
      columns,
      inferredTypes,
      sampleRowsCount: analysis.totalRecords,
      missingStats,
      timeFields,
      primaryKeyCandidates,
      qualityStats,
      encoding,
      sampleInfo: {
        ...sampleInfo,
        actualSamples: analysis.samples.length,
        totalRecords: analysis.totalRecords,
        samplingStrategy: analysis.totalRecords > analysis.samples.length ? "smart-sampling" : "full-data",
      },
      samplingWarning: analysis.totalRecords > analysis.samples.length,
      schemaConfidence: isFullFile ? 0.95 : 0.85,
      jsonAnalysis: {
        structure: analysis.structure,
        estimatedFields: analysis.estimatedFields,
        fileSize: analysis.fileSize,
        schema: analysis.schema,
      },
    }
  } catch (error) {
    console.error("[v0] JSON analyzer failed, falling back to legacy method:", error)
    return await profileJSON(text, sampleInfo, encoding, isFullFile)
  }
}

function extractColumnsFromSchema(schema: any): string[] {
  const columns: string[] = []

  if (schema.type === "object" && schema.properties) {
    columns.push(...Object.keys(schema.properties))
  } else if (schema.type === "array" && schema.items?.properties) {
    columns.push(...Object.keys(schema.items.properties))
  }

  return columns
}

function getFieldSchema(schema: any, fieldName: string): any {
  if (schema.type === "object" && schema.properties) {
    return schema.properties[fieldName]
  } else if (schema.type === "array" && schema.items?.properties) {
    return schema.items.properties[fieldName]
  }
  return null
}

function mapSchemaTypeToInferredType(schemaType: string, format?: string): string {
  if (format === "date-time") return "timestamp"
  if (format === "date") return "date"
  if (schemaType === "integer") return "integer"
  if (schemaType === "number") return "float"
  if (schemaType === "boolean") return "boolean"
  return "string"
}

function calculateRange(numbers: number[]): { min: number; max: number } | null {
  if (numbers.length === 0) return null
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  }
}

async function profileCSV(text: string, sampleInfo: any, encoding: string) {
  const lines = text.split("\n").slice(0, CSV_MAX_ROWS)
  if (lines.length === 0) return null

  const delimiters = [",", ";", "\t", "|"]
  let bestDelimiter = ","
  let maxScore = 0

  for (const delimiter of delimiters) {
    let score = 0
    let consistentColumns = true
    let firstRowColumns = 0

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const columns = lines[i].split(delimiter).length
      if (i === 0) {
        firstRowColumns = columns
      } else if (columns !== firstRowColumns) {
        consistentColumns = false
        break
      }
      score += columns
    }

    if (consistentColumns && score > maxScore) {
      maxScore = score
      bestDelimiter = delimiter
    }
  }

  const headers = lines[0].split(bestDelimiter).map((h) => h.trim().replace(/"/g, ""))
  const dataLines = lines.slice(1).filter((line) => line.trim())

  const rowHashes = new Set<string>()
  let duplicateCount = 0

  dataLines.forEach((line) => {
    const rowHash = line.trim()
    if (rowHashes.has(rowHash)) {
      duplicateCount++
    } else {
      rowHashes.add(rowHash)
    }
  })

  const duplicatesShare = dataLines.length > 0 ? duplicateCount / dataLines.length : 0
  console.log(
    `[v0] CSV duplicate detection: ${duplicateCount} duplicates out of ${dataLines.length} rows (${(duplicatesShare * 100).toFixed(2)}%)`,
  )

  const inferredTypes: Record<string, string> = {}
  const missingStats: Record<string, number> = {}
  const timeFields: string[] = []
  const primaryKeyCandidates: string[] = []
  const qualityStats: Record<string, any> = {}

  headers.forEach((header, index) => {
    const values = dataLines.map((line) => {
      const cols = line.split(bestDelimiter)
      return cols[index]?.trim().replace(/"/g, "") || ""
    })

    const nonEmptyValues = values.filter((v) => v && v !== "")
    const sampleSize = Math.min(nonEmptyValues.length, 500)
    const sample = nonEmptyValues.slice(0, sampleSize)

    let inferredType = "string"

    if (sample.every((v) => /^-?\d+$/.test(v))) {
      inferredType = "integer"
    } else if (sample.every((v) => !isNaN(Number(v)) && v !== "")) {
      inferredType = "float"
    } else if (sample.every((v) => /^(true|false|yes|no|1|0)$/i.test(v))) {
      inferredType = "boolean"
    } else if (sample.some((v) => /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/.test(v))) {
      inferredType = "timestamp"
      timeFields.push(header)
    } else if (sample.some((v) => /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{4}\/\d{2}$|^\d{2}-\d{4}\/\d{2}$/.test(v))) {
      inferredType = "date"
      timeFields.push(header)
    } else if (/^(time|date|timestamp|created|updated|modified)(_at|_on)?$/i.test(header)) {
      inferredType = "timestamp"
      timeFields.push(header)
    }

    inferredTypes[header] = inferredType

    const uniqueValues = new Set(nonEmptyValues)
    const uniqueness = uniqueValues.size / Math.max(nonEmptyValues.length, 1)
    const notNullRatio = nonEmptyValues.length / Math.max(values.length, 1)

    if (notNullRatio > 0.98 && uniqueness > 0.98) {
      primaryKeyCandidates.push(header)
    }

    qualityStats[header] = {
      notNull: notNullRatio,
      unique: uniqueness,
      range:
        inferredType === "integer" || inferredType === "float"
          ? {
              min: Math.min(...sample.map(Number).filter((n) => !isNaN(n))),
              max: Math.max(...sample.map(Number).filter((n) => !isNaN(n))),
            }
          : null,
    }

    missingStats[header] = values.length - nonEmptyValues.length
  })

  return {
    format: "csv" as const,
    columns: headers,
    inferredTypes,
    sampleRowsCount: dataLines.length,
    missingStats,
    timeFields,
    primaryKeyCandidates,
    qualityStats,
    encoding,
    sampleInfo,
    samplingWarning: sampleInfo.percent < 100,
    schemaConfidence: sampleInfo.percent >= 50 ? 0.8 : 0.6,
    delimiter: bestDelimiter,
    headerPresent: true,
    duplicatesShare,
  }
}

async function profileJSON(text: string, sampleInfo: any, encoding: string, isFullFile = false) {
  try {
    let items: any[] = []
    let isNDJSON = false

    const trimmedText = text.trim()
    if (trimmedText.includes("\n") && !trimmedText.startsWith("[")) {
      isNDJSON = true
      const lines = text.split("\n").filter((line) => line.trim())
      const maxLines = isFullFile ? lines.length : JSON_MAX_OBJS
      items = lines
        .slice(0, maxLines)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter((item) => item !== null)
    } else {
      try {
        const data = JSON.parse(text)
        items = Array.isArray(data) ? (isFullFile ? data : data.slice(0, JSON_MAX_OBJS)) : [data]
      } catch (error) {
        console.log("[v0] JSON parsing failed, attempting recovery:", error)

        const arrayMatch = text.match(/\[\s*({[^}]*})/s)
        if (arrayMatch) {
          try {
            const partialArray = JSON.parse(`[${arrayMatch[1]}]`)
            items = partialArray
            console.log("[v0] Successfully recovered partial JSON array")
          } catch (recoveryError) {
            console.log("[v0] JSON recovery failed:", recoveryError)
            throw new Error("Invalid JSON format - unable to parse or recover")
          }
        } else {
          const fixedText = text.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/'/g, '"')

          try {
            const fixedData = JSON.parse(fixedText)
            items = Array.isArray(fixedData)
              ? isFullFile
                ? fixedData
                : fixedData.slice(0, JSON_MAX_OBJS)
              : [fixedData]
            console.log("[v0] Successfully fixed and parsed JSON")
          } catch (fixError) {
            console.log("[v0] JSON fix attempt failed:", fixError)
            throw new Error("Invalid JSON format - unable to parse, recover, or fix")
          }
        }
      }
    }

    if (items.length === 0) return null

    const rowHashes = new Set<string>()
    let duplicateCount = 0

    items.forEach((item) => {
      const sortedKeys = Object.keys(item).sort()
      const rowHash = JSON.stringify(
        sortedKeys.reduce((acc: any, key) => {
          acc[key] = item[key]
          return acc
        }, {}),
      )

      if (rowHashes.has(rowHash)) {
        duplicateCount++
      } else {
        rowHashes.add(rowHash)
      }
    })

    const duplicatesShare = items.length > 0 ? duplicateCount / items.length : 0
    console.log(
      `[v0] JSON duplicate detection: ${duplicateCount} duplicates out of ${items.length} objects (${(duplicatesShare * 100).toFixed(2)}%)`,
    )

    const allKeys = new Set<string>()
    const keyFrequency: Record<string, number> = {}

    items.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        Object.keys(item).forEach((key) => {
          allKeys.add(key)
          keyFrequency[key] = (keyFrequency[key] || 0) + 1
        })
      }
    })

    const columns = Array.from(allKeys)
    const inferredTypes: Record<string, string> = {}
    const missingStats: Record<string, number> = {}
    const timeFields: string[] = []
    const primaryKeyCandidates: string[] = []
    const qualityStats: Record<string, any> = {}

    columns.forEach((col) => {
      const values = items.map((item) => item[col]).filter((v) => v != null)
      const sampleSize = Math.min(values.length, 500)
      const sample = values.slice(0, sampleSize)

      let inferredType = "string"

      if (sample.every((v) => Number.isInteger(v))) {
        inferredType = "integer"
      } else if (sample.every((v) => typeof v === "number")) {
        inferredType = "float"
      } else if (sample.every((v) => typeof v === "boolean")) {
        inferredType = "boolean"
      } else if (sample.some((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/.test(v))) {
        inferredType = "timestamp"
        timeFields.push(col)
      } else if (sample.some((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))) {
        inferredType = "date"
        timeFields.push(col)
      } else if (/^(time|date|timestamp|created|updated|modified)(_at|_on)?$/i.test(col)) {
        inferredType = "timestamp"
        timeFields.push(col)
      }

      inferredTypes[col] = inferredType

      const uniqueValues = new Set(values)
      const uniqueness = uniqueValues.size / Math.max(values.length, 1)
      const presence = keyFrequency[col] / items.length

      if (presence > 0.98 && uniqueness > 0.98) {
        primaryKeyCandidates.push(col)
      }

      qualityStats[col] = {
        notNull: presence,
        unique: uniqueness,
        range:
          inferredType === "integer" || inferredType === "float"
            ? {
                min: Math.min(...sample.filter((v) => typeof v === "number")),
                max: Math.max(...sample.filter((v) => typeof v === "number")),
              }
            : null,
      }

      missingStats[col] = items.length - values.length
    })

    return {
      format: isNDJSON ? "ndjson" : ("json" as const),
      columns,
      inferredTypes,
      sampleRowsCount: items.length,
      missingStats,
      timeFields,
      primaryKeyCandidates,
      qualityStats,
      encoding,
      sampleInfo,
      samplingWarning: !isFullFile && sampleInfo.percent < 100,
      schemaConfidence: isFullFile ? 0.95 : sampleInfo.percent >= 50 ? 0.8 : 0.6,
      duplicatesShare,
    }
  } catch (error) {
    console.error("[v0] JSON profiling error:", error)
    throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

async function profileXML(text: string, sampleInfo: any, encoding: string) {
  const elementMatches = text.match(/<(\w+)[^>]*>/g) || []
  const elements = elementMatches.slice(0, XML_MAX_RECORDS)

  const elementCounts: Record<string, number> = {}
  const attributeCounts: Record<string, Set<string>> = {}

  elements.forEach((match) => {
    const tagMatch = match.match(/<(\w+)([^>]*)>/)
    if (tagMatch) {
      const tagName = tagMatch[1]
      const attributes = tagMatch[2]

      elementCounts[tagName] = (elementCounts[tagName] || 0) + 1

      const attrMatches = attributes.match(/(\w+)=/g) || []
      if (!attributeCounts[tagName]) {
        attributeCounts[tagName] = new Set()
      }
      attrMatches.forEach((attr) => {
        attributeCounts[tagName].add(attr.replace("=", ""))
      })
    }
  })

  const rootElement = Object.entries(elementCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "root"

  const columns = [rootElement, ...(attributeCounts[rootElement] ? Array.from(attributeCounts[rootElement]) : [])]
  const inferredTypes: Record<string, string> = {}
  const qualityStats: Record<string, any> = {}

  columns.forEach((col) => {
    inferredTypes[col] = "string"
    qualityStats[col] = {
      notNull: 1.0,
      unique: 0.5,
      range: null,
    }
  })

  return {
    format: "xml" as const,
    columns,
    inferredTypes,
    sampleRowsCount: elements.length,
    missingStats: Object.fromEntries(columns.map((col) => [col, 0])),
    timeFields: [],
    primaryKeyCandidates: [],
    qualityStats,
    encoding,
    sampleInfo,
    samplingWarning: sampleInfo.percent < 100,
    schemaConfidence: sampleInfo.percent >= 30 ? 0.7 : 0.5,
  }
}
