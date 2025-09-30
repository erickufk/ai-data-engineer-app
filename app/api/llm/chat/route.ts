import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

export async function POST(request: NextRequest) {
  try {
    const { message, context, chatHistory } = await request.json()

    console.log("[v0] LLM Chat API called with message:", message)
    console.log("[v0] Chat history length:", chatHistory?.length || 0)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("[v0] GEMINI_API_KEY not found in environment variables")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })

    const contextSummary = {
      source: context?.sourcePreset?.name || "Not specified",
      sourceType: context?.sourcePreset?.type || "unknown",
      target: context?.targetPreset?.name || "Not specified",
      targetType: context?.targetPreset?.type || "unknown",
      hasMapping: !!context?.mapping,
      mappingCount: context?.mapping?.length || 0,
      loadMode: context?.loadPolicy?.mode || "Not specified",
    }

    const systemPrompt = `
You are an expert data engineer AI assistant specializing in ETL/ELT pipelines, data integration, and data architecture.

Current Context:
- Source: ${contextSummary.source} (${contextSummary.sourceType})
- Target: ${contextSummary.target} (${contextSummary.targetType})
- Mapping: ${contextSummary.mappingCount} fields mapped
- Load Mode: ${contextSummary.loadMode}

You should provide:
1. Specific, actionable advice
2. Best practices for data engineering
3. Performance optimization tips
4. Troubleshooting guidance
5. Code examples when relevant

Keep responses concise but comprehensive. Use Russian language for responses.
`

    const conversationHistory =
      chatHistory?.map((msg: any) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n") || ""

    const fullPrompt = `${systemPrompt}

Previous conversation:
${conversationHistory}

User question: ${message}

Please provide a helpful response in Russian.`

    console.log("[v0] Sending request to Gemini API")

    let lastError: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-001",
          contents: fullPrompt,
        })

        const text = response.text

        console.log("[v0] Gemini API response received, length:", text?.length || 0)

        if (!text) {
          throw new Error("Empty response from Gemini API")
        }

        return NextResponse.json({ response: text })
      } catch (error) {
        lastError = error as Error
        console.error(`[v0] Attempt ${attempt} failed:`, error)

        // If it's a 500 error, wait and retry with exponential backoff
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
        }
      }
    }

    // If all retries failed, return the error
    throw lastError
  } catch (error) {
    console.error("[v0] Error in LLM chat:", error)
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
