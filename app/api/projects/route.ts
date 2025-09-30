import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching projects:", error)
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Error in GET /api/projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: project, error } = await supabase
      .from("projects")
      .insert([
        {
          name: body.name,
          description: body.description,
          status: body.status || "draft",
          source_preset: body.sourcePreset,
          target_preset: body.targetPreset,
          source_config: body.sourceConfig,
          target_config: body.targetConfig,
          field_mapping: body.fieldMapping,
          schedule: body.schedule,
          load_mode: body.loadMode,
          load_policy: body.loadPolicy,
          pipeline_nodes: body.pipelineNodes,
          pipeline_edges: body.pipelineEdges,
          file_profile: body.fileProfile,
          recommendation: body.recommendation,
          artifacts_preview: body.artifactsPreview,
          report_draft: body.reportDraft,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating project:", error)
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error in POST /api/projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
