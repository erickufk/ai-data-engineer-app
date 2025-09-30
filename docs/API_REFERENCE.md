# AI Data Engineer - API Reference

## Overview

The AI Data Engineer API provides endpoints for data profiling, pipeline specification generation, and project artifact creation.

## Base URL

\`\`\`
Production: https://your-domain.com/api
Development: http://localhost:3000/api
\`\`\`

## Authentication

Currently, the API does not require authentication for public endpoints. In production, consider implementing API key authentication.

## Endpoints

### POST /api/profile

Analyzes uploaded data files and generates schema profiles.

#### Request

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (File, required): Data file to analyze (CSV, JSON, XML)
- `originalSize` (string, optional): Original file size in bytes
- `sampledBytes` (string, optional): Sampled bytes for analysis

#### Response

\`\`\`json
{
  "fileProfile": {
    "format": "csv|json|ndjson|xml",
    "columns": ["column1", "column2"],
    "inferredTypes": {
      "column1": "string|integer|float|boolean|date|timestamp",
      "column2": "string"
    },
    "sampleRowsCount": 1000,
    "missingStats": {
      "column1": 0,
      "column2": 5
    },
    "timeFields": ["created_at"],
    "primaryKeyCandidates": ["id"],
    "qualityStats": {
      "column1": {
        "notNull": 1.0,
        "unique": 0.95,
        "range": { "min": 1, "max": 1000 }
      }
    },
    "encoding": "utf-8",
    "sampleInfo": {
      "originalSize": 1048576,
      "sampledBytes": 1048576,
      "percent": 100
    },
    "samplingWarning": false,
    "schemaConfidence": 0.8
  }
}
\`\`\`

#### Error Responses

\`\`\`json
{
  "error": "No file provided"
}
\`\`\`

**Status Codes:**
- `200`: Success
- `400`: Bad request (invalid file, unsupported type)
- `500`: Server error

---

### POST /api/generate/spec

Generates pipeline specifications using LLM analysis.

#### Request

**Content-Type:** `application/json`

\`\`\`json
{
  "projectMeta": {
    "name": "My Data Pipeline",
    "description": "Pipeline for processing customer data"
  },
  "ingest": {
    "mode": "file|constructor",
    "fileProfile": { /* FileProfile object from /api/profile */ },
    "constructorSpec": { /* Constructor specification */ }
  },
  "recommendation": {
    "storage": "PostgreSQL|ClickHouse|HDFS",
    "rationale": ["Reason 1", "Reason 2"],
    "partitioning": "by_date|by_key|null",
    "loadMode": "append|merge|upsert",
    "schedule": {
      "frequency": "hourly|daily|weekly",
      "cron": "0 2 * * *"
    }
  },
  "pipeline": {
    "nodes": [
      {
        "id": "source-1",
        "type": "Source",
        "config": {}
      }
    ],
    "edges": [
      {
        "from": "source-1",
        "to": "target-1"
      }
    ]
  }
}
\`\`\`

#### Response

\`\`\`json
{
  "pipelineSpec": {
    "version": "1.0",
    "project": {
      "name": "My Data Pipeline",
      "description": "Pipeline for processing customer data"
    },
    "sources": [
      {
        "name": "source_data",
        "kind": "file|postgres|clickhouse|hdfs|kafka",
        "entity": "data.csv",
        "format": "csv",
        "schema": {
          "fields": [
            {
              "name": "id",
              "type": "integer",
              "nullable": false
            }
          ],
          "primaryKey": ["id"],
          "timeField": "created_at",
          "encoding": "utf-8",
          "timezone": "UTC"
        },
        "notes": null
      }
    ],
    "transforms": [
      {
        "id": "transform-1",
        "operator": "Filter|Project|Aggregate|Join|Deduplicate|TypeCast|DateTrunc|UpsertPrep",
        "params": {}
      }
    ],
    "targets": [
      {
        "name": "target_data",
        "kind": "postgres|clickhouse|hdfs",
        "entity": "target_table",
        "ddl": {
          "table": "target_table",
          "partitions": {
            "type": "by_date|by_key|null",
            "field": "created_at",
            "granularity": "day|month|null"
          },
          "indexes": [
            {
              "fields": ["id"],
              "type": "btree|hash|null"
            }
          ],
          "orderBy": ["id"]
        },
        "loadPolicy": {
          "mode": "append|merge|upsert",
          "dedupKeys": ["id"],
          "watermark": {
            "field": "updated_at",
            "delay": "PT1H"
          }
        }
      }
    ],
    "mappings": [
      {
        "from": "source_field",
        "to": "target_field",
        "transformId": "transform-1"
      }
    ],
    "schedule": {
      "frequency": "daily",
      "cron": "0 2 * * *",
      "slaNote": "Complete within 4 hours",
      "retries": {
        "count": 3,
        "delaySec": 300
      }
    },
    "nonFunctional": {
      "retention": {
        "policy": "90 days"
      },
      "dataQualityChecks": [
        {
          "check": "not_null|unique|range|format",
          "field": "id",
          "min": 1,
          "max": null
        }
      ],
      "pii": {
        "masking": ["email", "phone"],
        "notes": "GDPR compliance required"
      }
    }
  },
  "reportMarkdown": "# Pipeline Report\n\n...",
  "artifacts": [
    {
      "path": "/ddl/create_tables_postgres.sql",
      "summary": "DDL для PostgreSQL"
    }
  ],
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00Z",
    "version": "1.0",
    "validationPassed": true
  }
}
\`\`\`

#### Error Responses

\`\`\`json
{
  "error": "Validation failed",
  "details": [
    "Project name is required and must be a non-empty string",
    "Storage must be one of: PostgreSQL, ClickHouse, HDFS"
  ]
}
\`\`\`

**Status Codes:**
- `200`: Success
- `400`: Bad request (validation errors)
- `500`: Server error

---

### POST /api/generate/zip

Generates downloadable ZIP archive with project artifacts.

#### Request

**Content-Type:** `application/json`

\`\`\`json
{
  "pipelineSpec": { /* PipelineSpec object from /api/generate/spec */ },
  "reportMarkdown": "# Pipeline Report\n\n..."
}
\`\`\`

#### Response

**Content-Type:** `application/zip`

Returns a ZIP file containing:
- DDL scripts for target database
- Airflow DAG files
- Configuration files
- Documentation
- Environment templates

**Headers:**
- `Content-Disposition`: `attachment; filename="project_pipeline_v1.0_2024-01-15.zip"`
- `X-Generated-At`: ISO timestamp
- `X-Project-Name`: Project name

#### Error Responses

\`\`\`json
{
  "error": "Invalid pipeline specification",
  "details": [
    "Missing required field: version",
    "ClickHouse target must have at least one orderBy field"
  ],
  "warnings": [
    "HDFS target entity should be a path, not a table name"
  ]
}
\`\`\`

**Status Codes:**
- `200`: Success (ZIP file)
- `400`: Bad request (validation errors)
- `500`: Server error

---

## Data Types

### FileProfile

\`\`\`typescript
interface FileProfile {
  format: "csv" | "json" | "ndjson" | "xml"
  columns: string[]
  inferredTypes: Record<string, string>
  sampleRowsCount: number
  missingStats: Record<string, number>
  timeFields: string[]
  primaryKeyCandidates: string[]
  qualityStats: Record<string, {
    notNull: number
    unique: number
    range?: { min: number, max: number }
  }>
  encoding: string
  sampleInfo: {
    originalSize: number
    sampledBytes: number
    percent: number
  }
  samplingWarning: boolean
  schemaConfidence: number
}
\`\`\`

### PipelineSpec

See the complete PipelineSpec interface in the `/api/generate/spec` response example above.

## Rate Limits

- **File Upload**: 10 requests per minute per IP
- **Spec Generation**: 5 requests per minute per IP
- **ZIP Generation**: 3 requests per minute per IP

## Error Handling

All endpoints return consistent error responses:

\`\`\`json
{
  "error": "Error description",
  "message": "Detailed error message",
  "details": ["Specific validation errors"],
  "timestamp": "2024-01-15T10:30:00Z"
}
\`\`\`

## SDK Examples

### JavaScript/TypeScript

\`\`\`typescript
// File profiling
const formData = new FormData()
formData.append('file', file)
formData.append('originalSize', file.size.toString())

const profileResponse = await fetch('/api/profile', {
  method: 'POST',
  body: formData
})

const { fileProfile } = await profileResponse.json()

// Spec generation
const specResponse = await fetch('/api/generate/spec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectMeta,
    ingest: { mode: 'file', fileProfile },
    recommendation,
    pipeline
  })
})

const { pipelineSpec, reportMarkdown } = await specResponse.json()

// ZIP generation
const zipResponse = await fetch('/api/generate/zip', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pipelineSpec, reportMarkdown })
})

const zipBlob = await zipResponse.blob()
\`\`\`

### Python

\`\`\`python
import requests

# File profiling
with open('data.csv', 'rb') as f:
    files = {'file': f}
    data = {'originalSize': str(os.path.getsize('data.csv'))}
    
    response = requests.post('/api/profile', files=files, data=data)
    file_profile = response.json()['fileProfile']

# Spec generation
spec_data = {
    'projectMeta': project_meta,
    'ingest': {'mode': 'file', 'fileProfile': file_profile},
    'recommendation': recommendation,
    'pipeline': pipeline
}

response = requests.post('/api/generate/spec', json=spec_data)
result = response.json()

# ZIP generation
zip_data = {
    'pipelineSpec': result['pipelineSpec'],
    'reportMarkdown': result['reportMarkdown']
}

response = requests.post('/api/generate/zip', json=zip_data)
with open('pipeline.zip', 'wb') as f:
    f.write(response.content)
\`\`\`

## Webhooks (Future)

Future versions may support webhooks for long-running operations:

\`\`\`json
{
  "webhook_url": "https://your-app.com/webhook",
  "events": ["spec.generated", "zip.created", "validation.failed"]
}
\`\`\`

---

For more information, see the [Production Guide](./PRODUCTION_GUIDE.md) and project documentation.
