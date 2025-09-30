// Core types for the AI Data Engineer application

export interface ProjectMeta {
  name: string
  description: string
  createdAt: Date
}

export interface FileProfile {
  format: "csv" | "json" | "xml"
  columns: string[]
  inferredTypes: Record<string, string>
  sampleRowsCount: number
  missingStats: Record<string, number>
  timeFields: string[]
  sampleInfo?: {
    originalSize: number
    sampledBytes: number
    percent: number
  }
  samplingWarning?: boolean
  schemaConfidence?: number
}

export interface ConstructorSpec {
  source: {
    type: string
    entities: string[]
  }
  target: {
    type: string
    entities: string[]
  }
  notes: string
}

export interface IngestState {
  mode: "file" | "constructor"
  fileProfile?: FileProfile
  constructorSpec?: ConstructorSpec
}

export interface LoadPolicy {
  mode: "append" | "merge" | "upsert"
  dedupKeys?: string[]
  conflictStrategy?: "last-wins" | "first-wins"
  timestampField?: string
  timestampOrder?: "asc" | "desc"
  watermark?: {
    field: string
    delay: string // PT0S|PT15M|PT1H|P1D
  }
  createUniqueIndex?: boolean
  orderBy?: string[]
  versionField?: string
  partitioning?: {
    type: "by_date" | "by_key" | null
    field?: string
    granularity?: "hour" | "day" | "month"
  }
}

export interface Schedule {
  frequency: "hourly" | "daily" | "weekly"
  cron: string
  timezone?: string
  retries?: {
    count: number // 0-5
    delaySec: number // 60-3600
  }
  slaNote?: string // up to 80 chars
  catchup?: {
    enabled: boolean
    window?: "P1D" | "P7D" | "P30D"
  }
}

export interface Recommendation {
  storage: "PostgreSQL" | "ClickHouse" | "HDFS"
  rationale: string[]
  partitioning?: "by_date" | "by_key" | null
  loadMode: "append" | "merge" | "upsert"
  loadPolicy?: LoadPolicy
  schedule: Schedule
}

export interface PipelineNode {
  id: string
  type: "Source" | "Transform" | "Target"
  operator?: "Filter" | "Project" | "Aggregate" | "Join" | "Deduplicate" | "TypeCast" | "DateTrunc" | "Upsert"
  config: Record<string, any>
}

export interface PipelineEdge {
  from: string
  to: string
}

export interface PipelineState {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
}

export interface AppState {
  projectMeta: ProjectMeta
  ingest: IngestState
  recommendation?: Recommendation
  pipeline: PipelineState
  reportDraft?: string
  artifactsPreview: Array<{ path: string; description: string }>
}

export interface PipelineSpec {
  project: ProjectMeta
  storage: Recommendation
  pipeline: PipelineState
  ddlStrategy: {
    partitions: string[]
    indexes: string[]
    orderBy?: string[]
  }
  etlLogic: {
    extract: Record<string, any>
    transform: Record<string, any>
    load: Record<string, any>
  }
  schedule: Schedule
}
