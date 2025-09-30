import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { message, context, chatHistory } = await request.json()

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const systemPrompt = `
You are an expert data engineer AI assistant specializing in ETL/ELT pipelines, data integration, and data architecture.

Current Context:
- Source: ${context?.sourcePreset?.name || "Not specified"}
- Target: ${context?.targetPreset?.name || "Not specified"}
- Configuration: ${JSON.stringify(context?.config || {}, null, 2)}

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

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("Error in LLM chat:", error)
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 })
  }
}
