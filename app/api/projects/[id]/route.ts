import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    const { data: project, error } = await supabase.from("projects").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Error fetching project:", error)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { data: project, error } = await supabase
      .from("projects")
      .update({
        name: body.name,
        description: body.description,
        status: body.status,
        source_preset: body.sourcePreset,
        target_preset: body.targetPreset,
        source_config: body.sourceConfig,
        target_config: body.targetConfig,
        field_mapping: body.fieldMapping,
        schedule: body.schedule,
        load_mode: body.loadMode,
        pipeline_nodes: body.pipelineNodes,
        pipeline_edges: body.pipelineEdges,
        file_profile: body.fileProfile,
        recommendation: body.recommendation,
        artifacts_preview: body.artifactsPreview,
        report_draft: body.reportDraft,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating project:", error)
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error in PUT /api/projects/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    const { error } = await supabase.from("projects").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting project:", error)
      return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/projects/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
