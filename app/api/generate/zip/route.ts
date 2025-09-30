import { type NextRequest, NextResponse } from "next/server"
import { zipService } from "@/lib/zip-service"
import { schemaValidator } from "@/lib/schema-validator"
import type { PipelineSpecV1 } from "@/lib/llm-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pipelineSpec, reportMarkdown } = body

    if (!pipelineSpec || !reportMarkdown) {
      return NextResponse.json(
        {
          error: "Missing required data",
          details: ["pipelineSpec and reportMarkdown are required"],
        },
        { status: 400 },
      )
    }

    // Validate PipelineSpec structure using schema validator
    const validation = schemaValidator.validatePipelineSpec(pipelineSpec)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid pipeline specification",
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      )
    }

    console.log(`[v0] Generating ZIP for project: ${pipelineSpec.project.name}`)
    if (validation.warnings.length > 0) {
      console.log(`[v0] Validation warnings:`, validation.warnings)
    }

    // Generate ZIP file with enhanced structure and validation
    const zipBlob = await zipService.generateProjectZip(pipelineSpec as PipelineSpecV1, reportMarkdown)

    // Convert blob to buffer for response
    const buffer = Buffer.from(await zipBlob.arrayBuffer())

    const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const projectName = pipelineSpec.project.name.replace(/[^a-zA-Z0-9_-]/g, "_")
    const filename = `${projectName}_pipeline_v${pipelineSpec.version}_${timestamp}.zip`

    // Set headers for file download
    const headers = new Headers()
    headers.set("Content-Type", "application/zip")
    headers.set("Content-Disposition", `attachment; filename="${filename}"`)
    headers.set("Content-Length", buffer.length.toString())
    headers.set("X-Generated-At", new Date().toISOString())
    headers.set("X-Project-Name", pipelineSpec.project.name)

    console.log(`[v0] Successfully generated ZIP: ${filename} (${buffer.length} bytes)`)
    return new NextResponse(buffer, { headers })
  } catch (error) {
    console.error("Generate ZIP API Error:", error)

    const errorResponse = {
      error: "Failed to generate ZIP file",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
