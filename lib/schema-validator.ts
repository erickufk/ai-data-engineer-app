// JSON Schema validation for PipelineSpec
import type { PipelineSpecV1 } from "./llm-service"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class SchemaValidator {
  private readonly pipelineSpecSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "PipelineSpec v1",
    type: "object",
    required: ["version", "project", "sources", "targets", "schedule"],
    properties: {
      version: { type: "string" },
      project: {
        type: "object",
        required: ["name", "description"],
        properties: {
          name: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
        },
      },
      sources: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["name", "kind", "entity", "schema"],
          properties: {
            name: { type: "string" },
            kind: { enum: ["postgres", "clickhouse", "hdfs", "file", "api"] },
            entity: { type: "string" },
            format: { type: ["string", "null"] },
            schema: {
              type: "object",
              required: ["fields"],
              properties: {
                fields: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    required: ["name", "type", "nullable"],
                    properties: {
                      name: { type: "string" },
                      type: { enum: ["string", "integer", "float", "boolean", "datetime", "date", "json"] },
                      nullable: { type: "boolean" },
                    },
                  },
                },
                primaryKey: { type: "array", items: { type: "string" } },
                timeField: { type: ["string", "null"] },
              },
            },
          },
        },
      },
      transforms: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "operator"],
          properties: {
            id: { type: "string" },
            operator: { enum: ["filter", "aggregate", "join", "transform", "clean"] },
            params: { type: "object" },
          },
        },
      },
      targets: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["name", "kind", "entity", "ddl", "loadPolicy"],
          properties: {
            name: { type: "string" },
            kind: { enum: ["postgres", "clickhouse", "hdfs"] },
            entity: { type: "string" },
            ddl: {
              type: "object",
              required: ["table", "partitions", "indexes", "orderBy"],
              properties: {
                table: { type: "string" },
                partitions: {
                  type: "object",
                  properties: {
                    type: { enum: ["by_date", "by_hash", "none", null] },
                    field: { type: ["string", "null"] },
                    granularity: { enum: ["day", "month", "year", null] },
                  },
                },
                indexes: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["fields"],
                    properties: {
                      fields: { type: "array", items: { type: "string" } },
                      type: { enum: ["btree", "hash", "gin", "gist", null] },
                    },
                  },
                },
                orderBy: { type: "array", items: { type: "string" } },
              },
            },
            loadPolicy: {
              type: "object",
              required: ["mode"],
              properties: {
                mode: { enum: ["append", "upsert", "merge", "replace"] },
                dedupKeys: { type: "array", items: { type: "string" } },
                watermark: {
                  type: "object",
                  properties: {
                    field: { type: ["string", "null"] },
                    delay: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      schedule: {
        type: "object",
        required: ["frequency", "cron", "retries"],
        properties: {
          frequency: { enum: ["hourly", "daily", "weekly"] },
          cron: { type: "string" },
          slaNote: { type: ["string", "null"] },
          retries: {
            type: "object",
            required: ["count", "delaySec"],
            properties: {
              count: { type: "integer", minimum: 0 },
              delaySec: { type: "integer", minimum: 0 },
            },
          },
        },
      },
      mappings: {
        type: "array",
        items: {
          type: "object",
          required: ["from", "to"],
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            transformId: { type: ["string", "null"] },
          },
        },
      },
      nonFunctional: {
        type: "object",
        properties: {
          retention: {
            type: "object",
            properties: {
              policy: { type: ["string", "null"] },
            },
          },
          dataQualityChecks: {
            type: "array",
            items: {
              type: "object",
              required: ["check", "field"],
              properties: {
                check: { enum: ["not_null", "unique", "range", "format"] },
                field: { type: "string" },
                min: { type: ["number", "string", "null"] },
                max: { type: ["number", "string", "null"] },
              },
            },
          },
          pii: {
            type: "object",
            properties: {
              masking: { type: "array", items: { type: "string" } },
              notes: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  }

  validatePipelineSpec(spec: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    // Basic JSON Schema validation
    const schemaErrors = this.validateAgainstSchema(spec, this.pipelineSpecSchema)
    result.errors.push(...schemaErrors)

    // Business rules validation
    const businessErrors = this.validateBusinessRules(spec)
    result.errors.push(...businessErrors.errors)
    result.warnings.push(...businessErrors.warnings)

    result.isValid = result.errors.length === 0

    return result
  }

  private validateAgainstSchema(data: any, schema: any): string[] {
    const errors: string[] = []

    // Basic type and required field validation
    if (schema.type === "object" && typeof data !== "object") {
      errors.push(`Expected object, got ${typeof data}`)
      return errors
    }

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`)
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const propErrors = this.validateProperty(data[key], propSchema as any, key)
          errors.push(...propErrors)
        }
      }
    }

    return errors
  }

  private validateProperty(value: any, schema: any, fieldName: string): string[] {
    const errors: string[] = []

    if (schema.type) {
      if (Array.isArray(schema.type)) {
        if (!schema.type.includes(typeof value) && !(value === null && schema.type.includes("null"))) {
          errors.push(`Field ${fieldName}: expected one of ${schema.type.join(", ")}, got ${typeof value}`)
        }
      } else if (schema.type === "array") {
        if (!Array.isArray(value)) {
          errors.push(`Field ${fieldName}: expected array, got ${typeof value}`)
        } else {
          if (schema.minItems && value.length < schema.minItems) {
            errors.push(`Field ${fieldName}: array must have at least ${schema.minItems} items`)
          }
          if (schema.items) {
            value.forEach((item, index) => {
              const itemErrors = this.validateProperty(item, schema.items, `${fieldName}[${index}]`)
              errors.push(...itemErrors)
            })
          }
        }
      } else if (typeof value !== schema.type && !(value === null && schema.type === "null")) {
        errors.push(`Field ${fieldName}: expected ${schema.type}, got ${typeof value}`)
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Field ${fieldName}: value "${value}" not in allowed values: ${schema.enum.join(", ")}`)
    }

    if (schema.minLength && typeof value === "string" && value.length < schema.minLength) {
      errors.push(`Field ${fieldName}: string must be at least ${schema.minLength} characters`)
    }

    if (schema.minimum && typeof value === "number" && value < schema.minimum) {
      errors.push(`Field ${fieldName}: number must be at least ${schema.minimum}`)
    }

    return errors
  }

  private validateBusinessRules(spec: PipelineSpecV1): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!spec.targets || !Array.isArray(spec.targets)) {
      errors.push("Field targets: expected array, got " + typeof spec.targets)
      return { errors, warnings }
    }

    if (!spec.sources || !Array.isArray(spec.sources)) {
      errors.push("Field sources: expected array, got " + typeof spec.sources)
      return { errors, warnings }
    }

    // Rule 1: ClickHouse targets must have orderBy
    for (const target of spec.targets) {
      if (target.kind === "clickhouse" && (!target.ddl?.orderBy || target.ddl.orderBy.length === 0)) {
        errors.push(`ClickHouse target "${target.name}" must have at least one orderBy field`)
      }
    }

    // Rule 2: merge/upsert modes require dedupKeys
    for (const target of spec.targets) {
      if (
        ["merge", "upsert"].includes(target.loadPolicy?.mode) &&
        (!target.loadPolicy?.dedupKeys || target.loadPolicy.dedupKeys.length === 0)
      ) {
        errors.push(`Target "${target.name}" with ${target.loadPolicy?.mode} mode must have dedupKeys`)
      }
    }

    // Rule 3: HDFS targets should use path, not table
    for (const target of spec.targets) {
      if (target.kind === "hdfs" && target.entity?.includes(".")) {
        warnings.push(`HDFS target "${target.name}" entity should be a path, not a table name`)
      }
    }

    // Rule 4: by_date partitioning requires timeField
    for (const target of spec.targets) {
      if (target.ddl?.partitions?.type === "by_date" && !target.ddl.partitions.field) {
        errors.push(`Target "${target.name}" with by_date partitioning must specify partition field`)
      }
    }

    // Rule 5: Check if timeField exists in source schema
    for (const source of spec.sources) {
      if (source.schema?.timeField) {
        const fieldExists = source.schema.fields?.some((f) => f.name === source.schema.timeField)
        if (!fieldExists) {
          errors.push(`Source "${source.name}" timeField "${source.schema.timeField}" not found in schema fields`)
        }
      }
    }

    return { errors, warnings }
  }

  generateValidationErrorPrompt(errors: string[], warnings: string[]): string {
    let prompt = "The generated pipeline specification has validation errors. Please fix the following issues:\n\n"

    if (errors.length > 0) {
      prompt += "ERRORS (must fix):\n"
      errors.forEach((error, index) => {
        prompt += `${index + 1}. ${error}\n`
      })
      prompt += "\n"
    }

    if (warnings.length > 0) {
      prompt += "WARNINGS (recommended to fix):\n"
      warnings.forEach((warning, index) => {
        prompt += `${index + 1}. ${warning}\n`
      })
      prompt += "\n"
    }

    prompt +=
      "Please regenerate the pipeline specification addressing these issues. Ensure all required fields are present and business rules are followed."

    return prompt
  }
}

export const schemaValidator = new SchemaValidator()
