"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, FileText, Zap, HardDrive, MessageSquare, Sparkles } from "lucide-react"

export interface SystemPreset {
  id: string
  name: string
  type: "source" | "target" | "both"
  icon: string
  description: string
  category: "database" | "storage" | "streaming" | "file"
  recommended?: boolean
  fields: {
    name: string
    type: "text" | "number" | "select"
    required: boolean
    placeholder?: string
    options?: string[]
    envVar?: string
  }[]
  examples: {
    [key: string]: string
  }
  validations: {
    [key: string]: string
  }
}

export const renderPresetIcon = (iconType: string, className = "w-6 h-6") => {
  switch (iconType) {
    case "database":
      return <Database className={className} />
    case "zap":
      return <Zap className={className} />
    case "hard-drive":
      return <HardDrive className={className} />
    case "message-square":
      return <MessageSquare className={className} />
    case "file-text":
      return <FileText className={className} />
    default:
      return <Database className={className} />
  }
}

const systemPresets: SystemPreset[] = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    type: "both",
    icon: "database",
    description: "Реляционная база данных для OLTP и аналитики",
    category: "database",
    fields: [
      { name: "host", type: "text", required: true, placeholder: "${PG_HOST}", envVar: "PG_HOST" },
      { name: "port", type: "number", required: true, placeholder: "${PG_PORT}", envVar: "PG_PORT" },
      { name: "database", type: "text", required: true, placeholder: "${PG_DB}", envVar: "PG_DB" },
      { name: "schema", type: "text", required: true, placeholder: "public" },
      { name: "table", type: "text", required: true, placeholder: "events_daily" },
      { name: "timezone", type: "text", required: false, placeholder: "UTC" },
    ],
    examples: {
      schema: "public",
      table: "events_daily",
      entity: "public.events_daily",
    },
    validations: {
      entity: "^[a-zA-Z_][a-zA-Z0-9_]*\\.[a-zA-Z_][a-zA-Z0-9_]*$",
    },
  },
  {
    id: "clickhouse",
    name: "ClickHouse",
    type: "both",
    icon: "zap",
    description: "Колоночная СУБД для аналитики и OLAP",
    category: "database",
    fields: [
      { name: "host", type: "text", required: true, placeholder: "${CH_HOST}", envVar: "CH_HOST" },
      {
        name: "port",
        type: "select",
        required: true,
        options: ["8123", "9000"],
        placeholder: "${CH_PORT}",
        envVar: "CH_PORT",
      },
      { name: "database", type: "text", required: true, placeholder: "${CH_DB}", envVar: "CH_DB" },
      { name: "table", type: "text", required: true, placeholder: "events_agg" },
      { name: "orderBy", type: "text", required: true, placeholder: "event_time, user_id" },
    ],
    examples: {
      database: "dwh",
      table: "events_agg",
      entity: "dwh.events_agg",
      orderBy: "event_time, user_id",
    },
    validations: {
      entity: "^[a-zA-Z_][a-zA-Z0-9_]*\\.[a-zA-Z_][a-zA-Z0-9_]*$",
      orderBy: "required for target",
    },
  },
  {
    id: "hdfs",
    name: "HDFS/FS",
    type: "both",
    icon: "hard-drive",
    description: "Файловая система для больших данных",
    category: "storage",
    fields: [
      { name: "rootPath", type: "text", required: true, placeholder: "/data/raw/" },
      { name: "relativePath", type: "text", required: true, placeholder: "events/{YYYY}/{MM}/{DD}/" },
      { name: "format", type: "select", required: true, options: ["parquet", "csv", "json"] },
    ],
    examples: {
      rootPath: "/data/raw/",
      relativePath: "events/{YYYY}/{MM}/{DD}/",
      entity: "/data/raw/events/{YYYY}/{MM}/{DD}/",
    },
    validations: {
      rootPath: "^/.*/$",
      relativePath: "date placeholders: {YYYY}, {MM}, {DD}",
    },
  },
  {
    id: "kafka",
    name: "Kafka",
    type: "source",
    icon: "message-square",
    description: "Потоковая обработка данных в реальном времени",
    category: "streaming",
    recommended: true,
    fields: [
      {
        name: "bootstrapServers",
        type: "text",
        required: true,
        placeholder: "${KAFKA_BOOTSTRAP}",
        envVar: "KAFKA_BOOTSTRAP",
      },
      { name: "topic", type: "text", required: true, placeholder: "events-stream" },
      { name: "keyField", type: "text", required: false, placeholder: "user_id" },
      { name: "valueFormat", type: "select", required: true, options: ["JSON", "CSV"] },
      { name: "startingOffset", type: "select", required: true, options: ["latest", "earliest"] },
    ],
    examples: {
      topic: "events-stream",
      valueFormat: "JSON",
      startingOffset: "latest",
    },
    validations: {
      topic: "^[a-zA-Z0-9._-]+$",
    },
  },
  {
    id: "file",
    name: "File",
    type: "source",
    icon: "file-text",
    description: "Локальные или удаленные файлы данных",
    category: "file",
    fields: [
      { name: "format", type: "select", required: true, options: ["CSV", "JSON", "XML", "NDJSON"] },
      { name: "path", type: "text", required: true, placeholder: "/path/to/data.csv" },
      { name: "delimiter", type: "text", required: false, placeholder: "," },
      { name: "encoding", type: "select", required: false, options: ["utf-8", "utf-16", "latin1"] },
    ],
    examples: {
      format: "CSV",
      path: "/data/input/events.csv",
      delimiter: ",",
      encoding: "utf-8",
    },
    validations: {
      path: "valid file path required",
    },
  },
]

interface SystemPresetsProps {
  selectedSource?: SystemPreset
  selectedTarget?: SystemPreset
  onSelectSource: (preset: SystemPreset) => void
  onSelectTarget: (preset: SystemPreset) => void
  onFilePreviewAnalysis?: () => void
}

export function SystemPresets({
  selectedSource,
  selectedTarget,
  onSelectSource,
  onSelectTarget,
  onFilePreviewAnalysis,
}: SystemPresetsProps) {
  const sourcePresets = systemPresets.filter((p) => p.type === "source" || p.type === "both")
  const targetPresets = systemPresets.filter((p) => p.type === "target" || p.type === "both")

  return (
    <div className="space-y-8">
      {/* Source Systems */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Источники данных</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sourcePresets.map((preset) => (
            <Card
              key={`source-${preset.id}`}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedSource?.id === preset.id ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950" : ""
              }`}
              onClick={() => onSelectSource(preset)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {renderPresetIcon(preset.icon)}
                    <CardTitle className="text-base">{preset.name}</CardTitle>
                  </div>
                  {preset.recommended && (
                    <Badge variant="secondary" className="text-xs">
                      Рекомендуемо
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="text-sm">{preset.description}</CardDescription>

                {preset.id === "file" && selectedSource?.id === preset.id && onFilePreviewAnalysis && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onFilePreviewAnalysis()
                    }}
                    className="w-full flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Предварительный анализ файла</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Target Systems */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Целевые системы</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targetPresets.map((preset) => (
            <Card
              key={`target-${preset.id}`}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTarget?.id === preset.id ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-950" : ""
              }`}
              onClick={() => onSelectTarget(preset)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  {renderPresetIcon(preset.icon)}
                  <CardTitle className="text-base">{preset.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{preset.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export { systemPresets }
