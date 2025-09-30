"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Wand2,
  Info,
  Sparkles,
  CheckCircle,
  GripVertical,
  MoveRight,
  MoveLeft,
} from "lucide-react"
import type { SystemPreset } from "./system-presets"

interface FieldMappingProps {
  sourcePreset: SystemPreset
  targetPreset: SystemPreset
  sourceConfig: Record<string, string>
  targetConfig: Record<string, string>
  fieldMapping: Array<{ source: string; target: string; transform?: string }>
  onFieldMappingChange: (mapping: Array<{ source: string; target: string; transform?: string }>) => void
  fileAnalysisResult?: any
}

const transformOperators = [
  { value: "none", label: "Без изменений", category: "basic" },
  { value: "upper", label: "UPPER - в верхний регистр", category: "text" },
  { value: "lower", label: "LOWER - в нижний регистр", category: "text" },
  { value: "trim", label: "TRIM - убрать пробелы", category: "text" },
  { value: "date_trunc", label: "DATE_TRUNC - округлить дату", category: "date" },
  { value: "cast_int", label: "CAST INT - привести к числу", category: "type" },
  { value: "cast_string", label: "CAST STRING - привести к строке", category: "type" },
  { value: "coalesce", label: "COALESCE - заменить NULL", category: "basic" },
  // Новые операторы из пункта 2
  { value: "rename", label: "RENAME - переименовать поле", category: "basic" },
  { value: "substr", label: "SUBSTR - взять подстроку", category: "text" },
  { value: "replace", label: "REPLACE - заменить символы", category: "text" },
  { value: "regexp_replace", label: "REGEXP_REPLACE - замена по регулярному выражению", category: "text" },
  { value: "parse_date", label: "PARSE_DATE - парсинг нестандартных дат", category: "date" },
  { value: "parse_ts", label: "PARSE_TS - парсинг временных меток", category: "date" },
  { value: "date_shift", label: "DATE_SHIFT - сдвиг времени (часовой пояс)", category: "date" },
  { value: "round", label: "ROUND - округлить число до N знаков", category: "numeric" },
  { value: "split_part", label: "SPLIT_PART - часть строки по разделителю", category: "text" },
  { value: "map_value", label: "MAP_VALUE - перекодирование категорий", category: "advanced" },
  { value: "key_prep", label: "KEY_PREP - подготовка бизнес-ключа", category: "advanced" },
  { value: "hash", label: "HASH - хеширование", category: "advanced" },
  { value: "concat", label: "CONCAT - объединить поля", category: "text" },
  // Операторы над строками
  { value: "filter", label: "FILTER - фильтрация строк", category: "advanced" },
  { value: "deduplicate", label: "DEDUPLICATE - дедупликация по ключам", category: "advanced" },
  { value: "normalize", label: "NORMALIZE - нормализация", category: "text" },
  { value: "validate", label: "VALIDATE - валидация", category: "advanced" },
]

// Mock source fields based on preset type
const getSourceFields = (preset: SystemPreset, config: Record<string, string>, analysisResult?: any) => {
  if (analysisResult?.deepProfile?.schema?.fields) {
    return analysisResult.deepProfile.schema.fields.map((field: any) => field.name)
  }

  // Only return mock fields for file-based sources
  if (preset.id === "file") {
    return ["column_1", "column_2", "column_3", "timestamp", "value"]
  }

  // For database systems without analysis, return empty array to force manual input
  return []
}

const getTargetFields = (preset: SystemPreset, config: Record<string, string>, hasSourceFields = true) => {
  // Always return empty array - users must manually add target fields
  return []
}

export function FieldMapping({
  sourcePreset,
  targetPreset,
  sourceConfig,
  targetConfig,
  fieldMapping,
  onFieldMappingChange,
  fileAnalysisResult,
}: FieldMappingProps) {
  const [sourceFields, setSourceFields] = useState(getSourceFields(sourcePreset, sourceConfig, fileAnalysisResult))
  const [targetFields, setTargetFields] = useState<string[]>([])
  const [customTargetFields, setCustomTargetFields] = useState<string[]>([])
  const [mappingMode, setMappingMode] = useState<"auto" | "manual">(sourceFields.length === 0 ? "manual" : "auto")
  const [draggedField, setDraggedField] = useState<string | null>(null)
  const [transformFilter, setTransformFilter] = useState<string>("all")
  const [newTargetField, setNewTargetField] = useState("")
  const [customSourceFields, setCustomSourceFields] = useState<string[]>([])
  const [newSourceField, setNewSourceField] = useState("")

  useEffect(() => {
    if (fileAnalysisResult?.deepProfile?.schema?.fields) {
      const analysisFields = fileAnalysisResult.deepProfile.schema.fields.map((field: any) => field.name)
      setSourceFields(analysisFields)
      setTargetFields([])
      setMappingMode("auto")
    } else if (sourceFields.length === 0) {
      setMappingMode("manual")
      setTargetFields([])
    }
  }, [fileAnalysisResult, sourceFields.length, targetPreset, targetConfig])

  const handleDragStart = (e: React.DragEvent, field: string) => {
    setDraggedField(field)
    e.dataTransfer.setData("text/plain", field)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetField: string) => {
    e.preventDefault()
    const sourceField = e.dataTransfer.getData("text/plain")

    if (sourceField && targetField) {
      // Check if mapping already exists
      const existingIndex = fieldMapping.findIndex((m) => m.source === sourceField)

      if (existingIndex >= 0) {
        // Update existing mapping
        const updated = fieldMapping.map((mapping, i) =>
          i === existingIndex ? { ...mapping, target: targetField } : mapping,
        )
        onFieldMappingChange(updated)
      } else {
        // Create new mapping
        const newMapping = { source: sourceField, target: targetField, transform: undefined }
        onFieldMappingChange([...fieldMapping, newMapping])
      }
    }

    setDraggedField(null)
  }

  const transferAllFields = () => {
    const allTargetFields = [...targetFields, ...customTargetFields]
    if (allTargetFields.length === 0) {
      const newTargetFields = sourceFields.map((field) => field)
      setCustomTargetFields(newTargetFields)
      const allMappings = sourceFields.map((field) => ({
        source: field,
        target: field,
        transform: undefined,
      }))
      onFieldMappingChange(allMappings)
    } else {
      const allMappings = sourceFields.map((field) => ({
        source: field,
        target: allTargetFields.find((t) => t.toLowerCase() === field.toLowerCase()) || field,
        transform: undefined,
      }))
      onFieldMappingChange(allMappings)
    }
  }

  const clearAllMappings = () => {
    onFieldMappingChange([])
  }

  const autoSuggestMappings = () => {
    const allTargetFields = [...targetFields, ...customTargetFields]
    const suggestions: Array<{ source: string; target: string; transform?: string }> = []

    sourceFields.forEach((sourceField) => {
      const directMatch = allTargetFields.find((targetField) => targetField.toLowerCase() === sourceField.toLowerCase())

      if (directMatch) {
        // Smart transform suggestion based on field name patterns
        let suggestedTransform: string | undefined

        if (sourceField.toLowerCase().includes("email")) {
          suggestedTransform = "lower"
        } else if (sourceField.toLowerCase().includes("name")) {
          suggestedTransform = "trim"
        } else if (sourceField.toLowerCase().includes("date") || sourceField.toLowerCase().includes("time")) {
          suggestedTransform = "date_trunc"
        } else if (sourceField.toLowerCase().includes("id")) {
          suggestedTransform = "cast_string"
        }

        suggestions.push({ source: sourceField, target: directMatch, transform: suggestedTransform })
        return
      }

      const partialMatch = allTargetFields.find(
        (targetField) =>
          targetField.toLowerCase().includes(sourceField.toLowerCase()) ||
          sourceField.toLowerCase().includes(targetField.toLowerCase()),
      )

      if (partialMatch) {
        suggestions.push({ source: sourceField, target: partialMatch })
        return
      }

      if (sourceField.includes("time") || sourceField.includes("date")) {
        const timeTarget = allTargetFields.find((f) => f.includes("time") || f.includes("date"))
        if (timeTarget) {
          suggestions.push({
            source: sourceField,
            target: timeTarget,
            transform: "date_trunc",
          })
        }
      }
    })

    onFieldMappingChange(suggestions)
  }

  const autoSuggestFromAnalysis = () => {
    if (!fileAnalysisResult?.recommendation?.suggestedTransforms) {
      autoSuggestMappings()
      return
    }

    const allTargetFields = [...targetFields, ...customTargetFields]
    const suggestions: Array<{ source: string; target: string; transform?: string }> = []
    const transforms = fileAnalysisResult.recommendation.suggestedTransforms

    sourceFields.forEach((sourceField) => {
      const suggestedTransform = transforms.find(
        (t: any) => t.params?.field === sourceField || (t.operator === "TypeCast" && t.params?.field === sourceField),
      )

      const directMatch = allTargetFields.find((targetField) => targetField.toLowerCase() === sourceField.toLowerCase())

      if (directMatch) {
        suggestions.push({
          source: sourceField,
          target: directMatch,
          transform: suggestedTransform ? mapLLMTransformToOperator(suggestedTransform.operator) : undefined,
        })
        return
      }

      const targetField = findBestTargetField(sourceField, allTargetFields, fileAnalysisResult)
      if (targetField) {
        suggestions.push({
          source: sourceField,
          target: targetField,
          transform: suggestedTransform ? mapLLMTransformToOperator(suggestedTransform.operator) : undefined,
        })
      }
    })

    onFieldMappingChange(suggestions)
  }

  const addCustomTargetField = () => {
    if (newTargetField.trim() && !customTargetFields.includes(newTargetField.trim())) {
      setCustomTargetFields([...customTargetFields, newTargetField.trim()])
      setNewTargetField("")
    }
  }

  const removeCustomTargetField = (field: string) => {
    setCustomTargetFields(customTargetFields.filter((f) => f !== field))
    // Также удаляем все маппинги на это поле
    onFieldMappingChange(fieldMapping.filter((m) => m.target !== field))
  }

  const addCustomSourceField = () => {
    if (
      newSourceField.trim() &&
      !customSourceFields.includes(newSourceField.trim()) &&
      !sourceFields.includes(newSourceField.trim())
    ) {
      setCustomSourceFields([...customSourceFields, newSourceField.trim()])
      setNewSourceField("")
    }
  }

  const removeCustomSourceField = (field: string) => {
    setCustomSourceFields(customSourceFields.filter((f) => f !== field))
    // Also remove all mappings from this field
    onFieldMappingChange(fieldMapping.filter((m) => m.source !== field))
  }

  const addMapping = () => {
    const newMapping = { source: "", target: "", transform: "none" }
    onFieldMappingChange([...fieldMapping, newMapping])
  }

  const updateMapping = (index: number, field: keyof (typeof fieldMapping)[0], value: string) => {
    const updated = fieldMapping.map((mapping, i) => (i === index ? { ...mapping, [field]: value } : mapping))
    onFieldMappingChange(updated)
  }

  const removeMapping = (index: number) => {
    onFieldMappingChange(fieldMapping.filter((_, i) => i !== index))
  }

  const getMappingValidation = () => {
    const errors: string[] = []
    const usedTargets = new Set<string>()

    fieldMapping.forEach((mapping, index) => {
      if (mapping.source !== "*" && (!mapping.source || !mapping.target)) {
        errors.push(`Маппинг ${index + 1}: не выбраны поля`)
      }

      if (mapping.target && usedTargets.has(mapping.target)) {
        errors.push(`Поле "${mapping.target}" используется несколько раз`)
      }

      if (mapping.target) {
        usedTargets.add(mapping.target)
      }
    })

    return errors
  }

  const validationErrors = getMappingValidation()

  const mapLLMTransformToOperator = (llmOperator: string): string => {
    const mapping: Record<string, string> = {
      TypeCast: "cast_string",
      DateTrunc: "date_trunc",
      Filter: "filter",
      Deduplicate: "deduplicate",
    }
    return mapping[llmOperator] || "none"
  }

  const findBestTargetField = (sourceField: string, targetFields: string[], analysisResult: any): string | null => {
    if (analysisResult?.deepProfile?.schema?.timeField === sourceField) {
      return targetFields.find((f) => f.includes("time") || f.includes("date")) || null
    }

    return targetFields.find((f) => f.toLowerCase() === sourceField.toLowerCase()) || null
  }

  const getTransformOperatorsByCategory = (category: string) => {
    if (category === "all") return transformOperators
    return transformOperators.filter((op) => op.category === category)
  }

  const allSourceFields = [...sourceFields, ...customSourceFields]
  const allTargetFields = [...targetFields, ...customTargetFields]

  return (
    <div className="space-y-6">
      {fileAnalysisResult && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Результаты анализа файла</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Полей обнаружено:</span>
                <div className="text-lg font-bold text-green-600">
                  {fileAnalysisResult.deepProfile?.schema?.fields?.length || 0}
                </div>
              </div>
              <div>
                <span className="font-medium">Рекомендуемое хранилище:</span>
                <div className="text-lg font-bold text-blue-600">
                  {fileAnalysisResult.recommendation?.targetStorage || "N/A"}
                </div>
              </div>
              <div>
                <span className="font-medium">Временное поле:</span>
                <div className="text-lg font-bold text-purple-600">
                  {fileAnalysisResult.deepProfile?.schema?.timeField || "Нет"}
                </div>
              </div>
              <div>
                <span className="font-medium">Качество данных:</span>
                <div className="text-lg font-bold text-orange-600">
                  {((fileAnalysisResult.deepProfile?.sampling?.schemaConfidence || 0) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {fileAnalysisResult.recommendation?.suggestedTransforms?.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Рекомендуемые трансформации:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fileAnalysisResult.recommendation.suggestedTransforms.map((transform: any, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {transform.operator}: {JSON.stringify(transform.params)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Source Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              {sourcePreset.icon}
              <span>Источник: {sourcePreset.name}</span>
              {fileAnalysisResult && (
                <Badge variant="secondary" className="text-xs">
                  Анализ выполнен
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Поля источника:</Label>

              {allSourceFields.length === 0 && (
                <div className="space-y-3">
                  <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="text-sm font-medium">Поля не загружены, добавьте вручную</p>
                    <p className="text-xs">Введите названия полей источника</p>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Название поля источника"
                      value={newSourceField}
                      onChange={(e) => setNewSourceField(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addCustomSourceField()}
                    />
                    <Button size="sm" onClick={addCustomSourceField}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {allSourceFields.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {allSourceFields.map((field) => {
                    const fieldInfo = fileAnalysisResult?.deepProfile?.schema?.fields?.find(
                      (f: any) => f.name === field,
                    )
                    const isTimeField = fileAnalysisResult?.deepProfile?.schema?.timeField === field
                    const isMapped = fieldMapping.some((m) => m.source === field)
                    const isCustom = customSourceFields.includes(field)

                    return (
                      <div
                        key={field}
                        draggable={!isCustom}
                        onDragStart={(e) => !isCustom && handleDragStart(e, field)}
                        className={`flex items-center justify-between p-2 border rounded transition-colors ${
                          !isCustom ? "cursor-move hover:bg-muted/50" : ""
                        } ${
                          draggedField === field ? "opacity-50" : ""
                        } ${isMapped ? "bg-green-50 border-green-200" : ""}`}
                      >
                        <div className="flex items-center space-x-2">
                          {!isCustom && <GripVertical className="w-4 h-4 text-muted-foreground" />}
                          <Badge
                            variant={isTimeField ? "default" : isCustom ? "secondary" : "outline"}
                            className={`text-xs ${isTimeField ? "bg-purple-100 text-purple-800" : ""}`}
                          >
                            {field}
                            {fieldInfo && <span className="ml-1 text-xs opacity-70">({fieldInfo.type})</span>}
                          </Badge>
                          {isCustom && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomSourceField(field)}
                              className="h-4 w-4 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        {isMapped && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                    )
                  })}
                </div>
              )}

              {allSourceFields.length > 0 && (
                <div className="flex space-x-2 mt-3 pt-3 border-t">
                  <Input
                    placeholder="Добавить поле источника"
                    value={newSourceField}
                    onChange={(e) => setNewSourceField(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addCustomSourceField()}
                  />
                  <Button size="sm" onClick={addCustomSourceField}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Управление маппингом</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={transferAllFields}
                className="flex items-center justify-center space-x-2 bg-transparent"
                disabled={allSourceFields.length === 0}
                title="Создать целевые поля 1:1 из источника и сопоставить их"
              >
                <MoveRight className="w-4 h-4" />
                <span>1:1 маппинг</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={clearAllMappings}
                className="flex items-center justify-center space-x-2 bg-transparent"
              >
                <MoveLeft className="w-4 h-4" />
                <span>Очистить</span>
              </Button>
            </div>

            {fileAnalysisResult ? (
              <Button
                variant="outline"
                size="sm"
                onClick={autoSuggestFromAnalysis}
                className="w-full flex items-center justify-center space-x-2 bg-transparent"
              >
                <Sparkles className="w-4 h-4" />
                <span>Умное сопоставление</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={autoSuggestMappings}
                className="w-full flex items-center justify-center space-x-2 bg-transparent"
                disabled={allSourceFields.length === 0}
              >
                <Wand2 className="w-4 h-4" />
                <span>Предложить маппинг</span>
              </Button>
            )}

            <div className="text-center text-sm text-muted-foreground border-t pt-4">
              <p className="font-medium mb-1">Как использовать:</p>
              {allSourceFields.length === 0 ? (
                <>
                  <p>• Добавьте поля источника вручную</p>
                  <p>• Добавьте целевые поля вручную</p>
                  <p>• Создайте маппинг в разделе ниже</p>
                </>
              ) : (
                <>
                  <p>• Добавьте целевые поля вручную справа</p>
                  <p>• Используйте "1:1 маппинг" для автоматического создания</p>
                  <p>• Перетащите поля или настройте маппинг ниже</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Target Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              {targetPreset.icon}
              <span>Цель: {targetPreset.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Целевые поля:</Label>

              {allTargetFields.length === 0 && (
                <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg mb-3">
                  <p className="text-sm font-medium">Добавьте целевые поля вручную</p>
                  <p className="text-xs">Или используйте кнопку "1:1 маппинг" для автоматического создания</p>
                </div>
              )}

              <div className="flex space-x-2 mb-3">
                <Input
                  placeholder="Добавить целевое поле"
                  value={newTargetField}
                  onChange={(e) => setNewTargetField(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addCustomTargetField()}
                />
                <Button size="sm" onClick={addCustomTargetField}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {allTargetFields.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {allTargetFields.map((field) => {
                    const mappedSource = fieldMapping.find((m) => m.target === field)?.source
                    const isCustom = customTargetFields.includes(field)

                    return (
                      <div
                        key={field}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, field)}
                        className={`flex items-center justify-between p-2 border rounded transition-colors ${
                          draggedField ? "border-dashed border-blue-300 bg-blue-50" : ""
                        } ${mappedSource ? "bg-green-50 border-green-200" : "hover:bg-muted/50"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <Badge variant={isCustom ? "secondary" : "outline"} className="text-xs">
                            {field}
                          </Badge>
                          {isCustom && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomTargetField(field)}
                              className="h-4 w-4 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        {mappedSource && (
                          <div className="flex items-center space-x-1">
                            <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{mappedSource}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Field Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Настройка маппинга</CardTitle>
          <CardDescription>
            {allSourceFields.length === 0 || allTargetFields.length === 0
              ? "Добавьте поля источника и цели, затем настройте их сопоставление"
              : "Настройте трансформации для каждого сопоставления полей"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldMapping.length > 0 && (
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Label className="text-sm">Фильтр трансформаций:</Label>
              <select
                value={transformFilter}
                onChange={(e) => setTransformFilter(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="all">Все категории</option>
                <option value="basic">Базовые</option>
                <option value="text">Текстовые</option>
                <option value="numeric">Числовые</option>
                <option value="date">Даты</option>
                <option value="type">Типы данных</option>
                <option value="advanced">Продвинутые</option>
              </select>
            </div>
          )}

          {fieldMapping.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {allSourceFields.length === 0 || allTargetFields.length === 0 ? (
                <>
                  <p>Сначала добавьте поля источника и цели</p>
                  <p className="text-sm">Используйте поля ввода выше для добавления полей</p>
                </>
              ) : (
                <>
                  <p>Создайте сопоставления полей</p>
                  <p className="text-sm">Перетащите поля или используйте кнопки управления</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {fieldMapping.map((mapping, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg">
                  {/* Source Field */}
                  <div className="col-span-4">
                    {allSourceFields.length === 0 ? (
                      <Input
                        placeholder="Введите поле источника"
                        value={mapping.source}
                        onChange={(e) => updateMapping(index, "source", e.target.value)}
                      />
                    ) : (
                      <Select value={mapping.source} onValueChange={(value) => updateMapping(index, "source", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Поле источника" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="*">* (все поля)</SelectItem>
                          {allSourceFields.map((field) => {
                            const fieldInfo = fileAnalysisResult?.deepProfile?.schema?.fields?.find(
                              (f: any) => f.name === field,
                            )
                            return (
                              <SelectItem key={field} value={field}>
                                {field}
                                {fieldInfo && <span className="ml-1 text-xs opacity-70">({fieldInfo.type})</span>}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 flex justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Target Field */}
                  <div className="col-span-4">
                    {mapping.source === "*" ? (
                      <Input placeholder="* (автоматически)" value="*" disabled className="bg-muted" />
                    ) : allTargetFields.length === 0 ? (
                      <Input
                        placeholder="Введите целевое поле"
                        value={mapping.target}
                        onChange={(e) => updateMapping(index, "target", e.target.value)}
                      />
                    ) : (
                      <Select value={mapping.target} onValueChange={(value) => updateMapping(index, "target", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Целевое поле" />
                        </SelectTrigger>
                        <SelectContent>
                          {allTargetFields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Transform */}
                  <div className="col-span-2">
                    <Select
                      value={mapping.transform || "none"}
                      onValueChange={(value) => updateMapping(index, "transform", value === "none" ? undefined : value)}
                      disabled={mapping.source === "*"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getTransformOperatorsByCategory(transformFilter).map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-center">
                    <Button variant="ghost" size="sm" onClick={() => removeMapping(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" onClick={addMapping} className="w-full bg-transparent">
            <Plus className="w-4 h-4 mr-2" />
            Добавить сопоставление
          </Button>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Mapping Summary */}
          {fieldMapping.length > 0 && validationErrors.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {fieldMapping.some((m) => m.source === "*") ? (
                  "Настроено автоматическое сопоставление всех полей (*). Все поля будут скопированы как есть."
                ) : (
                  <>
                    Настроено {fieldMapping.length} сопоставлений полей.
                    {fieldMapping.filter((m) => m.transform && m.transform !== "none").length > 0 &&
                      ` Применяются трансформации: ${fieldMapping.filter((m) => m.transform && m.transform !== "none").length}`}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
