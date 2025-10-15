"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChevronLeft, ChevronRight, Database, ArrowRight, Clock, Sparkles, AlertCircle } from "lucide-react"
import { SystemPresets, type SystemPreset, systemPresets, renderPresetIcon } from "./system-presets"
import { ConstructorForms } from "./constructor-forms"
import { FieldMapping } from "./field-mapping"
import { ScheduleConfig } from "./schedule-config"
import { UnifiedAIChat } from "./unified-ai-chat"
import { ArtifactsGeneration } from "./artifacts-generation"
import { FilePreviewAnalysis } from "./file-preview-analysis"
import { getDummyConfig, getDummyFieldMapping, getDummySchedule, getDummyScenario } from "@/lib/dummy-data"
import type { LoadPolicy, Schedule } from "@/lib/types"

type ConstructorStep = "source" | "target" | "mapping" | "schedule" | "artifacts"

interface StepConstructorProps {
  onComplete: (config: {
    sourcePreset: SystemPreset
    targetPreset: SystemPreset
    sourceConfig: Record<string, string>
    targetConfig: Record<string, string>
    fieldMapping: Array<{ source: string; target: string; transform?: string }>
    schedule: Schedule
    loadMode: string
    loadPolicy?: LoadPolicy
  }) => void
}

export function StepConstructor({ onComplete }: StepConstructorProps) {
  const [currentStep, setCurrentStep] = useState<ConstructorStep>("source")
  const [selectedSourcePreset, setSelectedSourcePreset] = useState<SystemPreset>()
  const [selectedTargetPreset, setSelectedTargetPreset] = useState<SystemPreset>()
  const [sourceConfig, setSourceConfig] = useState<Record<string, string>>({})
  const [targetConfig, setTargetConfig] = useState<Record<string, string>>({})
  const [fieldMapping, setFieldMapping] = useState<Array<{ source: string; target: string; transform?: string }>>([])
  const [schedule, setSchedule] = useState<Schedule>({
    frequency: "daily",
    cron: "0 2 * * *",
    retries: { count: 2, delaySec: 300 },
    catchup: { enabled: false },
  })
  const [loadMode, setLoadMode] = useState("append")
  const [loadPolicy, setLoadPolicy] = useState<LoadPolicy>({
    mode: "append",
    dedupKeys: [],
    conflictStrategy: "last-wins",
    createUniqueIndex: false,
    orderBy: [],
    timestampField: "",
    versionField: "",
  })

  const [showFilePreview, setShowFilePreview] = useState(false)
  const [fileAnalysisResult, setFileAnalysisResult] = useState<any>(null)

  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)

  const steps = [
    { key: "source" as const, title: "Источник", iconType: "database" },
    { key: "target" as const, title: "Цель", iconType: "database" },
    { key: "mapping" as const, title: "Маппинг", iconType: "arrow" },
    { key: "schedule" as const, title: "Расписание", iconType: "clock" },
    { key: "artifacts" as const, title: "Артефакты", iconType: "sparkles" },
  ]

  const currentStepIndex = steps.findIndex((step) => step.key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const getTargetFields = () => {
    return fieldMapping.map((mapping) => mapping.target).filter(Boolean)
  }

  const getTimeField = () => {
    const timeFields = fieldMapping.filter(
      (m) =>
        m.target.toLowerCase().includes("time") ||
        m.target.toLowerCase().includes("date") ||
        m.target.toLowerCase().includes("created") ||
        m.target.toLowerCase().includes("updated"),
    )
    return timeFields.length > 0 ? timeFields[0].target : undefined
  }

  const handleFilePreviewAnalysis = () => {
    setShowFilePreview(true)
  }

  const handleAnalysisComplete = (result: any) => {
    console.log("[v0] File analysis completed:", result)
    setFileAnalysisResult(result)
    setShowFilePreview(false)

    if (result.deepProfile?.schema?.fields) {
      const mappings = result.deepProfile.schema.fields.map((field: any) => ({
        source: field.name,
        target: field.name,
        transform: undefined,
      }))
      setFieldMapping(mappings)
    }

    if (result.recommendation?.targetStorage) {
      const targetPreset = systemPresets.find(
        (p) => p.name.toLowerCase() === result.recommendation.targetStorage.toLowerCase(),
      )
      if (targetPreset) {
        setSelectedTargetPreset(targetPreset)
      }
    }
  }

  const handleAnalysisBack = () => {
    setShowFilePreview(false)
  }

  const fillWithScenario = (scenarioId: string) => {
    const scenario = getDummyScenario(scenarioId as any)
    if (!scenario) return

    const sourcePreset = systemPresets.find((p) => p.id === scenario.source)
    const targetPreset = systemPresets.find((p) => p.id === scenario.target)

    if (sourcePreset && targetPreset) {
      setSelectedSourcePreset(sourcePreset)
      setSelectedTargetPreset(targetPreset)
      setSourceConfig(getDummyConfig(scenario.source))
      setTargetConfig(getDummyConfig(scenario.target))
      setFieldMapping(getDummyFieldMapping(scenario.source, scenario.target))
      setSchedule(getDummySchedule(scenario.schedule as any))
      setLoadMode("append")
    }
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case "source":
        return selectedSourcePreset && Object.keys(sourceConfig).length > 0
      case "target":
        return selectedTargetPreset && Object.keys(targetConfig).length > 0
      case "mapping":
        return fieldMapping.length > 0
      case "schedule":
        if (
          (loadMode === "merge" || loadMode === "upsert") &&
          (!loadPolicy.dedupKeys || loadPolicy.dedupKeys.length === 0)
        ) {
          return false
        }

        if (
          (loadMode === "merge" || loadMode === "upsert") &&
          loadPolicy.conflictStrategy === "last-wins" &&
          !loadPolicy.timestampField &&
          !loadPolicy.versionField
        ) {
          return false
        }

        return schedule.frequency && schedule.cron
      case "artifacts":
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (!canProceedToNext()) return

    const currentIndex = steps.findIndex((step) => step.key === currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key)
    } else {
      setShowCompletionDialog(true)
    }
  }

  const handleBack = () => {
    const currentIndex = steps.findIndex((step) => step.key === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key)
    }
  }

  const handleLLMSuggestion = (suggestion: { type: string; data: any }) => {
    switch (suggestion.type) {
      case "config":
        if (suggestion.data.sourceConfig) {
          setSourceConfig((prev) => ({ ...prev, ...suggestion.data.sourceConfig }))
        }
        if (suggestion.data.targetConfig) {
          setTargetConfig((prev) => ({ ...prev, ...suggestion.data.targetConfig }))
        }
        break
      case "mapping":
        if (suggestion.data.fieldMapping) {
          setFieldMapping(suggestion.data.fieldMapping)
        }
        break
      case "schedule":
        if (suggestion.data.schedule) {
          setSchedule(suggestion.data.schedule)
        }
        if (suggestion.data.loadMode) {
          setLoadMode(suggestion.data.loadMode)
        }
        break
    }
  }

  const handleCompleteConfirmed = () => {
    if (selectedSourcePreset && selectedTargetPreset) {
      console.log("[v0] Completing pipeline configuration...")
      try {
        onComplete({
          sourcePreset: selectedSourcePreset,
          targetPreset: selectedTargetPreset,
          sourceConfig,
          targetConfig,
          fieldMapping,
          schedule,
          loadMode,
          loadPolicy,
        })
        setShowCompletionDialog(false)
      } catch (error) {
        console.error("[v0] Error completing pipeline:", error)
      }
    } else {
      console.error("[v0] Missing required presets for completion")
    }
  }

  const handleNewProject = () => {
    console.log("[v0] Resetting project and returning to step 0")

    // Clear sessionStorage
    try {
      sessionStorage.removeItem("pipeline-draft")
      console.log("[v0] Cleared pipeline draft from session storage")
    } catch (error) {
      console.error("[v0] Failed to clear session storage:", error)
    }

    // Reset all state
    setCurrentStep("source")
    setSelectedSourcePreset(undefined)
    setSelectedTargetPreset(undefined)
    setSourceConfig({})
    setTargetConfig({})
    setFieldMapping([])
    setSchedule({
      frequency: "daily",
      cron: "0 2 * * *",
      retries: { count: 2, delaySec: 300 },
      catchup: { enabled: false },
    })
    setLoadMode("append")
    setLoadPolicy({
      mode: "append",
      dedupKeys: [],
      conflictStrategy: "last-wins",
      createUniqueIndex: false,
      orderBy: [],
      timestampField: "",
      versionField: "",
    })
    setFileAnalysisResult(null)
    setLastSaved(null)
    setShowCompletionDialog(false)

    // Reload the page to return to step 0
    window.location.reload()
  }

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem("pipeline-draft")
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        console.log("[v0] Loading draft from session storage")

        if (draft.selectedSourcePreset) setSelectedSourcePreset(draft.selectedSourcePreset)
        if (draft.selectedTargetPreset) setSelectedTargetPreset(draft.selectedTargetPreset)
        if (draft.sourceConfig) setSourceConfig(draft.sourceConfig)
        if (draft.targetConfig) setTargetConfig(draft.targetConfig)
        if (draft.fieldMapping) setFieldMapping(draft.fieldMapping)
        if (draft.schedule) setSchedule(draft.schedule)
        if (draft.loadMode) setLoadMode(draft.loadMode)
        if (draft.loadPolicy) setLoadPolicy(draft.loadPolicy)
        if (draft.fileAnalysisResult) setFileAnalysisResult(draft.fileAnalysisResult)
      }
    } catch (error) {
      console.error("[v0] Failed to load draft from session storage:", error)
    }
  }, [])

  useEffect(() => {
    if (!selectedSourcePreset && !selectedTargetPreset) return

    const saveDraft = () => {
      try {
        const draftData = {
          selectedSourcePreset,
          selectedTargetPreset,
          sourceConfig,
          targetConfig,
          fieldMapping,
          schedule,
          loadMode,
          loadPolicy,
          fileAnalysisResult,
          lastSaved: new Date().toISOString(),
        }

        sessionStorage.setItem("pipeline-draft", JSON.stringify(draftData))
        setLastSaved(new Date())
        console.log("[v0] Draft saved to session storage")
      } catch (error) {
        console.error("[v0] Failed to save draft to session storage:", error)
      }
    }

    const timeoutId = setTimeout(saveDraft, 1000)
    return () => clearTimeout(timeoutId)
  }, [
    selectedSourcePreset,
    selectedTargetPreset,
    sourceConfig,
    targetConfig,
    fieldMapping,
    schedule,
    loadMode,
    loadPolicy,
    fileAnalysisResult,
  ])

  const renderStepIcon = (iconType: string) => {
    switch (iconType) {
      case "database":
        return <Database className="w-4 h-4" />
      case "arrow":
        return <ArrowRight className="w-4 h-4" />
      case "clock":
        return <Clock className="w-4 h-4" />
      case "sparkles":
        return <Sparkles className="w-4 h-4" />
      default:
        return <Database className="w-4 h-4" />
    }
  }

  if (showFilePreview) {
    return <FilePreviewAnalysis onAnalysisComplete={handleAnalysisComplete} onBack={handleAnalysisBack} />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Пошаговый конструктор</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                Шаг {currentStepIndex + 1} из {steps.length}
              </Badge>
              {lastSaved && (
                <Badge variant="secondary" className="text-xs">
                  Сохранено {lastSaved.toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>

        {selectedSourcePreset && selectedTargetPreset && (
          <CardContent className="pt-0">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {renderPresetIcon(selectedSourcePreset.icon)}
                    <span className="font-medium">{selectedSourcePreset.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="flex items-center space-x-2">
                    {renderPresetIcon(selectedTargetPreset.icon)}
                    <span className="font-medium">{selectedTargetPreset.name}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {schedule.frequency}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {loadMode}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        )}

        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center space-x-2 ${
                  index <= currentStepIndex ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : index === currentStepIndex
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStepIndex ? "✓" : renderStepIcon(step.iconType)}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
                {index < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground ml-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {renderStepIcon(steps[currentStepIndex].iconType)}
            <span>
              Шаг {currentStepIndex + 1}: {steps[currentStepIndex].title}
            </span>
          </CardTitle>
          <CardDescription>
            {currentStep === "source" && "Выберите и настройте источник данных"}
            {currentStep === "target" && "Выберите и настройте целевую систему"}
            {currentStep === "mapping" && "Настройте соответствие полей и трансформации"}
            {currentStep === "schedule" && "Настройте расписание и режим загрузки"}
            {currentStep === "artifacts" && "Просмотрите и скачайте сгенерированные артефакты"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="config">Конфигурация</TabsTrigger>
              <TabsTrigger value="assistant" className="flex items-center space-x-1">
                <Sparkles className="w-4 h-4" />
                <span>AI Помощник</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6">
              {currentStep === "source" && (
                <div className="space-y-6">
                  <SystemPresets
                    selectedSource={selectedSourcePreset}
                    selectedTarget={undefined}
                    onSelectSource={(preset) => {
                      setSelectedSourcePreset(preset)
                      setSourceConfig({})
                    }}
                    onSelectTarget={() => {}}
                    onFilePreviewAnalysis={handleFilePreviewAnalysis}
                  />

                  {selectedSourcePreset && (
                    <ConstructorForms
                      sourcePreset={selectedSourcePreset}
                      targetPreset={undefined}
                      sourceConfig={sourceConfig}
                      targetConfig={{}}
                      onSourceConfigChange={setSourceConfig}
                      onTargetConfigChange={() => {}}
                    />
                  )}
                </div>
              )}

              {currentStep === "target" && (
                <div className="space-y-6">
                  {selectedSourcePreset && (
                    <div className="p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>Источник:</span>
                        {selectedSourcePreset.icon}
                        <span className="font-medium">{selectedSourcePreset.name}</span>
                        {fileAnalysisResult && (
                          <Badge variant="secondary" className="text-xs">
                            Анализ выполнен
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <SystemPresets
                    selectedSource={undefined}
                    selectedTarget={selectedTargetPreset}
                    onSelectSource={() => {}}
                    onSelectTarget={(preset) => {
                      setSelectedTargetPreset(preset)
                      setTargetConfig({})
                    }}
                  />

                  {selectedTargetPreset && (
                    <ConstructorForms
                      sourcePreset={undefined}
                      targetPreset={selectedTargetPreset}
                      sourceConfig={{}}
                      targetConfig={targetConfig}
                      onSourceConfigChange={() => {}}
                      onTargetConfigChange={setTargetConfig}
                    />
                  )}
                </div>
              )}

              {currentStep === "mapping" && selectedSourcePreset && selectedTargetPreset && (
                <FieldMapping
                  sourcePreset={selectedSourcePreset}
                  targetPreset={selectedTargetPreset}
                  sourceConfig={sourceConfig}
                  targetConfig={targetConfig}
                  fieldMapping={fieldMapping}
                  onFieldMappingChange={setFieldMapping}
                  fileAnalysisResult={fileAnalysisResult}
                />
              )}

              {currentStep === "schedule" && (
                <ScheduleConfig
                  schedule={schedule}
                  loadMode={loadMode}
                  loadPolicy={loadPolicy}
                  onScheduleChange={setSchedule}
                  onLoadModeChange={setLoadMode}
                  onLoadPolicyChange={setLoadPolicy}
                  targetPreset={selectedTargetPreset}
                  targetFields={getTargetFields()}
                  timeField={getTimeField()}
                />
              )}

              {currentStep === "artifacts" && selectedSourcePreset && selectedTargetPreset && (
                <ArtifactsGeneration
                  sourcePreset={selectedSourcePreset}
                  targetPreset={selectedTargetPreset}
                  sourceConfig={sourceConfig}
                  targetConfig={targetConfig}
                  fieldMapping={fieldMapping}
                  schedule={schedule}
                  loadMode={loadMode}
                />
              )}
            </TabsContent>

            <TabsContent value="assistant">
              <UnifiedAIChat
                sourcePreset={selectedSourcePreset}
                targetPreset={selectedTargetPreset}
                sourceConfig={sourceConfig}
                targetConfig={targetConfig}
                onSuggestionApply={handleLLMSuggestion}
                onSystemSelect={(type, preset) => {
                  if (type === "source") {
                    setSelectedSourcePreset(preset)
                    setSourceConfig({})
                  } else {
                    setSelectedTargetPreset(preset)
                    setTargetConfig({})
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStepIndex === 0}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <div className="flex items-center space-x-2">
          {(loadMode === "merge" || loadMode === "upsert") &&
            currentStep === "schedule" &&
            (!loadPolicy.dedupKeys || loadPolicy.dedupKeys.length === 0) && (
              <Badge variant="destructive" className="text-xs flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Требуются ключи дедупликации</span>
              </Badge>
            )}

          {(loadMode === "merge" || loadMode === "upsert") &&
            loadPolicy.conflictStrategy === "last-wins" &&
            currentStep === "schedule" &&
            !loadPolicy.timestampField &&
            !loadPolicy.versionField && (
              <Badge variant="destructive" className="text-xs flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Требуется поле времени</span>
              </Badge>
            )}

          <Button onClick={handleNext} disabled={!canProceedToNext()}>
            {currentStepIndex === steps.length - 1 ? "Завершить" : "Далее"}
            {currentStepIndex < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>

      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Завершение создания пайплайна</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>Сохраните созданные артефакты локально.</div>
              <div className="text-sm text-muted-foreground">
                После завершения вы сможете скачать все сгенерированные файлы конфигурации.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleNewProject} variant="outline">
              Новый проект
            </AlertDialogAction>
            <AlertDialogAction onClick={handleCompleteConfirmed}>Завершить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
