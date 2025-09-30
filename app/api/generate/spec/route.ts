import { type NextRequest, NextResponse } from "next/server"
import { llmService } from "@/lib/llm-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectMeta, ingest, recommendation, pipeline } = body

    console.log("[v0] Generate Spec API called")
    console.log("[v0] Request body keys:", Object.keys(body))
    console.log("[v0] ProjectMeta:", projectMeta ? "present" : "missing")
    console.log("[v0] Ingest:", ingest ? "present" : "missing")
    console.log("[v0] Recommendation:", recommendation ? "present" : "missing")
    console.log("[v0] Pipeline:", pipeline ? "present" : "missing")

    const validationErrors: string[] = []

    if (!projectMeta) {
      validationErrors.push("Missing projectMeta")
    } else {
      if (!projectMeta.name || typeof projectMeta.name !== "string" || projectMeta.name.trim().length === 0) {
        validationErrors.push("Project name is required and must be a non-empty string")
      }
      if (
        !projectMeta.description ||
        typeof projectMeta.description !== "string" ||
        projectMeta.description.trim().length === 0
      ) {
        validationErrors.push("Project description is required and must be a non-empty string")
      }
    }

    if (!ingest) {
      validationErrors.push("Missing ingest configuration")
    } else {
      if (!ingest.mode || !["file", "constructor"].includes(ingest.mode)) {
        validationErrors.push("Ingest mode must be 'file' or 'constructor'")
      }
      if (ingest.mode === "file" && !ingest.fileProfile) {
        validationErrors.push("File profile is required for file ingest mode")
      }
      if (ingest.mode === "constructor" && !ingest.constructorSpec) {
        validationErrors.push("Constructor spec is required for constructor ingest mode")
      }
    }

    if (!recommendation) {
      validationErrors.push("Missing recommendation")
    } else {
      if (!recommendation.storage || !["PostgreSQL", "ClickHouse", "HDFS"].includes(recommendation.storage)) {
        validationErrors.push("Storage must be one of: PostgreSQL, ClickHouse, HDFS")
      }
      if (!recommendation.loadMode || !["append", "merge", "upsert"].includes(recommendation.loadMode)) {
        validationErrors.push("Load mode must be one of: append, merge, upsert")
      }
      if (!recommendation.schedule) {
        validationErrors.push("Schedule configuration is required")
      } else {
        if (
          !recommendation.schedule.frequency ||
          !["hourly", "daily", "weekly"].includes(recommendation.schedule.frequency)
        ) {
          validationErrors.push("Schedule frequency must be one of: hourly, daily, weekly")
        }
        if (!recommendation.schedule.cron || typeof recommendation.schedule.cron !== "string") {
          validationErrors.push("Schedule cron expression is required")
        }
      }
    }

    if (!pipeline) {
      validationErrors.push("Missing pipeline configuration")
    } else {
      if (!Array.isArray(pipeline.nodes)) {
        validationErrors.push("Pipeline nodes must be an array")
      }
      if (!Array.isArray(pipeline.edges)) {
        validationErrors.push("Pipeline edges must be an array")
      }
    }

    if (validationErrors.length > 0) {
      console.log("[v0] Validation errors:", validationErrors)
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 },
      )
    }

    console.log(`[v0] Generating spec for project: ${projectMeta.name}`)
    console.log(`[v0] Storage: ${recommendation.storage}, Mode: ${recommendation.loadMode}`)

    let result
    try {
      result = await llmService.generatePipelineSpec({
        projectMeta,
        ingest,
        recommendation,
        pipeline,
      })
      console.log("[v0] LLM service completed successfully")
    } catch (llmError) {
      console.error("[v0] LLM service error:", llmError)
      throw new Error(`LLM service failed: ${llmError instanceof Error ? llmError.message : String(llmError)}`)
    }

    const response = {
      ...result,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: "1.0",
        validationPassed: true,
      },
    }

    console.log(`[v0] Successfully generated spec for project: ${projectMeta.name}`)
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Generate Spec API Error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    const errorResponse = {
      error: "Failed to generate specification",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
      debug: {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
      },
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
