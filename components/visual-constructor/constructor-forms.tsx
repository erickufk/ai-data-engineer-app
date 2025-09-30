"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Info, TestTube } from "lucide-react"
import type { SystemPreset } from "./system-presets"
import { getDummyConfig } from "@/lib/dummy-data"

interface ConstructorFormsProps {
  sourcePreset?: SystemPreset
  targetPreset?: SystemPreset
  sourceConfig: Record<string, string>
  targetConfig: Record<string, string>
  onSourceConfigChange: (config: Record<string, string>) => void
  onTargetConfigChange: (config: Record<string, string>) => void
}

export function ConstructorForms({
  sourcePreset,
  targetPreset,
  sourceConfig,
  targetConfig,
  onSourceConfigChange,
  onTargetConfigChange,
}: ConstructorFormsProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  const validateField = (preset: SystemPreset, fieldName: string, value: string): string[] => {
    const errors: string[] = []
    const field = preset.fields.find((f) => f.name === fieldName)

    if (!field) return errors

    if (field.required && !value.trim()) {
      errors.push(`Поле ${fieldName} обязательно для заполнения`)
    }

    // Custom validations from preset
    if (preset.validations[fieldName] && value) {
      const validation = preset.validations[fieldName]
      if (validation.startsWith("^") && validation.endsWith("$")) {
        // Regex validation
        const regex = new RegExp(validation)
        if (!regex.test(value)) {
          errors.push(`Неверный формат для ${fieldName}`)
        }
      }
    }

    return errors
  }

  const renderSystemForm = (
    preset: SystemPreset,
    config: Record<string, string>,
    onConfigChange: (config: Record<string, string>) => void,
    title: string,
    colorClass: string,
  ) => (
    <Card className={`${colorClass}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {preset.icon}
          <span>
            {title}: {preset.name}
          </span>
        </CardTitle>
        <CardDescription>{preset.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const dummyData = getDummyConfig(preset.id)
              onConfigChange({ ...config, ...dummyData })
            }}
            className="flex items-center space-x-2"
          >
            <TestTube className="w-4 h-4" />
            <span>Заполнить тестовыми данными</span>
          </Button>
        </div>

        {/* Configuration Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {preset.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`${preset.id}-${field.name}`} className="flex items-center space-x-2">
                <span>{field.name}</span>
                {field.required && (
                  <Badge variant="destructive" className="text-xs">
                    Обязательно
                  </Badge>
                )}
                {field.envVar && (
                  <Badge variant="outline" className="text-xs">
                    ENV
                  </Badge>
                )}
              </Label>

              {field.type === "select" ? (
                <Select
                  value={config[field.name] || ""}
                  onValueChange={(value) => onConfigChange({ ...config, [field.name]: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`${preset.id}-${field.name}`}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={config[field.name] || ""}
                  onChange={(e) => onConfigChange({ ...config, [field.name]: e.target.value })}
                />
              )}

              {validationErrors[`${preset.id}-${field.name}`] && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationErrors[`${preset.id}-${field.name}`].join(", ")}</AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </div>

        {/* Examples Section */}
        {Object.keys(preset.examples).length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Примеры заполнения</span>
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {Object.entries(preset.examples).map(([key, value]) => (
                <div key={key} className="flex space-x-2">
                  <span className="font-mono">{key}:</span>
                  <span className="font-mono bg-background px-1 rounded">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Button */}
        <Button
          variant="outline"
          onClick={() => {
            const errors: Record<string, string[]> = {}
            preset.fields.forEach((field) => {
              const fieldErrors = validateField(preset, field.name, config[field.name] || "")
              if (fieldErrors.length > 0) {
                errors[`${preset.id}-${field.name}`] = fieldErrors
              }
            })
            setValidationErrors(errors)
          }}
          className="w-full"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Проверить формат
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {sourcePreset &&
        renderSystemForm(
          sourcePreset,
          sourceConfig,
          onSourceConfigChange,
          "Источник",
          "border-blue-200 dark:border-blue-800",
        )}

      {targetPreset &&
        renderSystemForm(
          targetPreset,
          targetConfig,
          onTargetConfigChange,
          "Цель",
          "border-green-200 dark:border-green-800",
        )}
    </div>
  )
}
