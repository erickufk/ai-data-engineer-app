import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { sourcePreset, targetPreset, sourceConfig, targetConfig, userContext } = await request.json()

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const prompt = `
You are an expert data engineer AI assistant. Analyze the following data pipeline configuration and provide specific, actionable suggestions.

Source System: ${sourcePreset?.name} (${sourcePreset?.id})
Target System: ${targetPreset?.name} (${targetPreset?.id})

Source Configuration: ${JSON.stringify(sourceConfig, null, 2)}
Target Configuration: ${JSON.stringify(targetConfig, null, 2)}

User Context: ${userContext || "General optimization"}

Please provide suggestions in the following categories:
1. Configuration optimizations
2. Field mapping recommendations  
3. Schedule and load mode suggestions
4. Performance optimizations
5. Best practices and potential issues

Format your response as JSON with the following structure:
{
  "suggestions": [
    {
      "type": "config|mapping|schedule|optimization",
      "title": "Brief title",
      "description": "Detailed explanation",
      "confidence": "high|medium|low",
      "data": { /* specific configuration changes */ },
      "reasoning": "Why this suggestion is important"
    }
  ]
}

Focus on practical, implementable suggestions based on the specific systems and configuration provided.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      const suggestions = JSON.parse(text)
      return NextResponse.json(suggestions)
    } catch (parseError) {
      // If JSON parsing fails, return a structured response
      return NextResponse.json({
        suggestions: [
          {
            type: "optimization",
            title: "AI Analysis Complete",
            description: text,
            confidence: "medium",
            data: {},
            reasoning: "General AI recommendations based on your configuration",
          },
        ],
      })
    }
  } catch (error) {
    console.error("Error generating LLM suggestions:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
