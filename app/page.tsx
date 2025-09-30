"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Database,
  FileText,
  Workflow,
  Settings,
  Download,
  CheckCircle,
  Upload,
  X,
  AlertCircle,
  Clock,
  Zap,
  HardDrive,
  Package,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import type { FileProfile, AppState, Recommendation } from "@/lib/types"
import { PipelineCanvas } from "@/components/pipeline-canvas"
import type { SystemPreset } from "@/components/visual-constructor/system-presets"
import { StepConstructor } from "@/components/visual-constructor/step-constructor"
import { getDummyScenario, getDummyConfig, getDummyFieldMapping, getDummySchedule } from "@/lib/dummy-data"
import { systemPresets } from "@/components/visual-constructor/system-presets"

type Step = "start" | "ingest" | "recommendations" | "pipeline" | "review" | "export"

export default function AIDataEngineerPage() {
  const [currentStep, setCurrentStep] = useState<Step>("start")
  const [appState, setAppState] = useState<AppState>({
    projectMeta: {
      name: "",
      description: "",
      createdAt: new Date(),
    },
    ingest: {
      mode: "file",
    },
    pipeline: {
      nodes: [],
      edges: [],
    },
    artifactsPreview: [],
  })
  const [trajectory, setTrajectory] = useState<"file" | "constructor">("constructor") // Set default to constructor
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [fileProfile, setFileProfile] = useState<FileProfile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedStorage, setSelectedStorage] = useState<"PostgreSQL" | "ClickHouse" | "HDFS" | null>(null)
  const [recommendations, setRecommendations] = useState<Record<string, Recommendation> | null>(null)
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)
  const [isGeneratingZip, setIsGeneratingZip] = useState(false)
  const [selectedSourcePreset, setSelectedSourcePreset] = useState<SystemPreset>()
  const [selectedTargetPreset, setSelectedTargetPreset] = useState<SystemPreset>()
  const [sourceConfig, setSourceConfig] = useState<Record<string, string>>({})
  const [targetConfig, setTargetConfig] = useState<Record<string, string>>({})

  const [projectId, setProjectId] = useState<string | null>(null)
  const [isSavingProject, setIsSavingProject] = useState(false)

  const steps: { key: Step; title: string; icon: React.ReactNode }[] = [
    { key: "start", title: "Старт", icon: <Settings className="w-4 h-4" /> },
    { key: "ingest", title: "Загрузка", icon: <FileText className="w-4 h-4" /> },
    { key: "recommendations", title: "Рекомендации", icon: <Database className="w-4 h-4" /> },
    { key: "pipeline", title: "Пайплайн", icon: <Workflow className="w-4 h-4" /> },
    { key: "review", title: "Обзор", icon: <CheckCircle className="w-4 h-4" /> },
    { key: "export", title: "Экспорт", icon: <Download className="w-4 h-4" /> },
  ]

  const currentStepIndex = steps.findIndex((step) => step.key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleScenarioSelect = useCallback((scenarioId: string) => {
    const scenario = getDummyScenario(scenarioId as any)
    if (!scenario) return

    const sourcePreset = systemPresets.find((p) => p.id === scenario.source)
    const targetPreset = systemPresets.find((p) => p.id === scenario.target)

    if (sourcePreset && targetPreset) {
      // Set project metadata based on scenario
      setAppState((prev) => ({
        ...prev,
        projectMeta: {
          ...prev.projectMeta,
          name: scenario.name,
          description: scenario.description,
        },
        ingest: {
          ...prev.ingest,
          mode: "constructor",
          constructorSpec: {
            source: {
              type: scenario.source,
              entity: "sample_data",
              config: getDummyConfig(scenario.source),
            },
            target: {
              type: scenario.target,
              entity: "processed_data",
              config: getDummyConfig(scenario.target),
              loadPolicy: "append",
            },
            mapping: getDummyFieldMapping(scenario.source, scenario.target),
            schedule: getDummySchedule(scenario.schedule as any),
          },
        },
      }))

      // Set trajectory and presets
      setTrajectory("constructor")
      setSelectedSourcePreset(sourcePreset)
      setSelectedTargetPreset(targetPreset)
      setSourceConfig(getDummyConfig(scenario.source))
      setTargetConfig(getDummyConfig(scenario.target))

      // Auto-proceed to next step
      setCurrentStep("ingest")
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    const validFiles = files.filter((file) => {
      const validTypes = [".csv", ".json", ".xml", ".xlsx", ".xls"]
      return validTypes.some((type) => file.name.toLowerCase().endsWith(type))
    })

    if (validFiles.length === 0) {
      setError("Пожалуйста, загрузите файлы поддерживаемых форматов: CSV, JSON, XML, Excel")
      return
    }

    setUploadedFiles(validFiles)
    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()

      const MAX_PROFILE_BYTES = 10 * 1024 * 1024 // 10MB

      for (const file of validFiles) {
        const isJsonFile = file.name.toLowerCase().endsWith(".json")
        const chunk = isJsonFile ? file : file.slice(0, MAX_PROFILE_BYTES)
        const chunkFile = new File([chunk], file.name, { type: file.type })

        formData.append("files", chunkFile)
        formData.append("originalSize", file.size.toString())
        formData.append("sampledBytes", chunk.size.toString())
        formData.append("isFullFile", isJsonFile.toString())
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Ошибка при анализе файлов")
      }

      const profile = await response.json()
      setFileProfile(profile)

      setAppState((prev) => ({
        ...prev,
        ingest: {
          ...prev.ingest,
          files: validFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
          fileProfile: profile,
        },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при обработке файлов")
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    setFileProfile(null)
  }, [])

  const profileFiles = useCallback(async () => {
    if (uploadedFiles.length === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      const file = uploadedFiles[0]
      const MAX_PROFILE_BYTES = 10 * 1024 * 1024 // 10MB

      const isJsonFile = file.name.toLowerCase().endsWith(".json")
      const chunk = isJsonFile ? file : file.slice(0, MAX_PROFILE_BYTES)
      const chunkFile = new File([chunk], file.name, { type: file.type })

      formData.append("file", chunkFile)
      formData.append("originalSize", file.size.toString())
      formData.append("sampledBytes", chunk.size.toString())
      formData.append("isFullFile", isJsonFile.toString())

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Ошибка при анализе файла")
      }

      const data = await response.json()
      setFileProfile(data.fileProfile)

      // Update app state
      setAppState((prev) => ({
        ...prev,
        ingest: {
          ...prev.ingest,
          fileProfile: data.fileProfile,
        },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка")
    } finally {
      setIsProcessing(false)
    }
  }, [uploadedFiles])

  const generateRecommendations = useCallback(async () => {
    if (!fileProfile && !appState.ingest.constructorSpec) return

    setIsGeneratingRecommendations(true)
    setError(null)

    try {
      // Generate recommendations based on data profile
      const mockRecommendations: Record<string, Recommendation> = {
        PostgreSQL: {
          storage: "PostgreSQL",
          rationale: [
            "Подходит для транзакционных данных с ACID гарантиями",
            "Богатые возможности индексирования и запросов",
            "Поддержка JSON и сложных типов данных",
            fileProfile?.timeFields.length ? "Хорошая поддержка временных рядов" : "Стандартная реляционная модель",
          ],
          partitioning: fileProfile?.timeFields.length ? "by_date" : "by_key",
          loadMode: "upsert",
          schedule: {
            frequency: "daily",
            cron: "0 2 * * *",
          },
        },
        ClickHouse: {
          storage: "ClickHouse",
          rationale: [
            "Оптимально для аналитических запросов и агрегаций",
            "Колоночное хранение для быстрой обработки больших объёмов",
            "Эффективное сжатие данных",
            fileProfile?.sampleRowsCount && fileProfile.sampleRowsCount > 1000
              ? "Подходит для больших датасетов"
              : "Может быть избыточным для малых данных",
          ],
          partitioning: "by_date",
          loadMode: "append",
          schedule: {
            frequency: "hourly",
            cron: "0 * * * *",
          },
        },
        HDFS: {
          storage: "HDFS",
          rationale: [
            "Подходит для больших объёмов неструктурированных данных",
            "Горизонтальное масштабирование",
            "Интеграция с экосистемой Hadoop и Spark",
            "Экономичное хранение архивных данных",
          ],
          partitioning: "by_date",
          loadMode: "append",
          schedule: {
            frequency: "daily",
            cron: "0 1 * * *",
          },
        },
      }

      setRecommendations(mockRecommendations)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при генерации рекомендаций")
    } finally {
      setIsGeneratingRecommendations(false)
    }
  }, [fileProfile, appState.ingest.constructorSpec])

  const selectRecommendation = useCallback(
    (storage: "PostgreSQL" | "ClickHouse" | "HDFS") => {
      if (!recommendations) return

      setSelectedStorage(storage)
      setAppState((prev) => ({
        ...prev,
        recommendation: recommendations[storage],
      }))
    },
    [recommendations],
  )

  const updateSchedule = useCallback(
    (frequency: "hourly" | "daily" | "weekly") => {
      if (!selectedStorage || !recommendations) return

      const cronMap = {
        hourly: "0 * * * *",
        daily: "0 2 * * *",
        weekly: "0 2 * * 0",
      }

      const updatedRecommendation = {
        ...recommendations[selectedStorage],
        schedule: {
          frequency,
          cron: cronMap[frequency],
        },
      }

      setAppState((prev) => ({
        ...prev,
        recommendation: updatedRecommendation,
      }))

      setRecommendations((prev) =>
        prev
          ? {
              ...prev,
              [selectedStorage]: updatedRecommendation,
            }
          : null,
      )
    },
    [selectedStorage, recommendations],
  )

  const updateLoadMode = useCallback(
    (loadMode: "append" | "merge" | "upsert") => {
      if (!selectedStorage || !recommendations) return

      const updatedRecommendation = {
        ...recommendations[selectedStorage],
        loadMode,
      }

      setAppState((prev) => ({
        ...prev,
        recommendation: updatedRecommendation,
      }))

      setRecommendations((prev) =>
        prev
          ? {
              ...prev,
              [selectedStorage]: updatedRecommendation,
            }
          : null,
      )
    },
    [selectedStorage, recommendations],
  )

  const canProceedToNext = useCallback(() => {
    switch (currentStep) {
      case "start":
        return appState.projectMeta.name.trim().length > 0
      case "ingest":
        if (trajectory === "constructor") {
          return (
            selectedSourcePreset &&
            selectedTargetPreset &&
            Object.keys(sourceConfig).length > 0 &&
            Object.keys(targetConfig).length > 0
          )
        }
        // Remove file trajectory logic since it's no longer used
        return false
      case "recommendations":
        return selectedStorage !== null && recommendations !== null
      case "pipeline":
        return appState.pipeline.nodes.length > 0
      case "review":
        return appState.artifactsPreview.length > 0
      default:
        return true
    }
  }, [
    currentStep,
    appState,
    trajectory,
    selectedStorage,
    recommendations,
    selectedSourcePreset,
    selectedTargetPreset,
    sourceConfig,
    targetConfig,
  ])

  const handleNext = useCallback(() => {
    if (!canProceedToNext()) return

    const stepOrder: Step[] = ["start", "ingest", "recommendations", "pipeline", "review", "export"]
    const currentIndex = stepOrder.indexOf(currentStep)

    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1]

      // Auto-generate recommendations when moving to recommendations step
      if (nextStep === "recommendations" && !recommendations) {
        generateRecommendations()
      }

      setCurrentStep(nextStep)
    }
  }, [currentStep, canProceedToNext, recommendations, generateRecommendations])

  const handleBack = useCallback(() => {
    const stepOrder: Step[] = ["start", "ingest", "recommendations", "pipeline", "review", "export"]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }, [currentStep])

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }, [])

  const saveProject = useCallback(async () => {
    if (!appState.projectMeta.name || !appState.recommendation) return

    setIsSavingProject(true)
    try {
      const projectData = {
        name: appState.projectMeta.name,
        description: appState.projectMeta.description,
        status: "completed",
        sourcePreset: selectedSourcePreset,
        targetPreset: selectedTargetPreset,
        sourceConfig,
        targetConfig,
        fieldMapping: appState.ingest.constructorSpec?.mapping || [],
        schedule: appState.recommendation.schedule,
        loadMode: appState.recommendation.loadMode,
        pipelineNodes: appState.pipeline.nodes,
        pipelineEdges: appState.pipeline.edges,
        fileProfile: appState.ingest.fileProfile,
        recommendation: appState.recommendation,
        artifactsPreview: appState.artifactsPreview,
        reportDraft: appState.reportDraft,
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      })

      if (response.ok) {
        const { project } = await response.json()
        setProjectId(project.id)
        console.log("[v0] Project saved successfully:", project.id)
      } else {
        throw new Error("Failed to save project")
      }
    } catch (error) {
      console.error("Failed to save project:", error)
      setError("Не удалось сохранить проект в базу данных")
    } finally {
      setIsSavingProject(false)
    }
  }, [appState, selectedSourcePreset, selectedTargetPreset, sourceConfig, targetConfig])

  const generatePipelineSpec = useCallback(async () => {
    if (!appState.recommendation || appState.pipeline.nodes.length === 0) return

    setIsGeneratingSpec(true)
    setError(null)

    try {
      const ingestData = {
        mode: "file" as const,
        fileProfile: appState.ingest.fileProfile,
        constructorSpec: appState.ingest.constructorSpec,
      }

      const response = await fetch("/api/generate/spec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectMeta: appState.projectMeta,
          ingest: ingestData, // Send as ingest object instead of separate fields
          recommendation: appState.recommendation,
          pipeline: appState.pipeline,
        }),
      })

      if (!response.ok) {
        throw new Error("Ошибка при генерации спецификации")
      }

      const data = await response.json()

      setAppState((prev) => ({
        ...prev,
        reportDraft: data.reportDraft,
        artifactsPreview: data.artifacts,
      }))

      // Move to review step
      setCurrentStep("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при генерации спецификации")
    } finally {
      setIsGeneratingSpec(false)
    }
  }, [appState])

  const downloadZip = useCallback(async () => {
    if (!appState.reportDraft || !appState.recommendation) return

    setIsGeneratingZip(true)
    setError(null)

    try {
      await saveProject()

      const pipelineSpec = {
        project: appState.projectMeta,
        recommendation: appState.recommendation,
        pipeline: appState.pipeline,
      }

      const response = await fetch("/api/generate/zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipelineSpec,
          reportDraft: appState.reportDraft,
        }),
      })

      if (!response.ok) {
        throw new Error("Ошибка при генерации ZIP файла")
      }

      // Download the ZIP file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${appState.projectMeta.name.replace(/\s+/g, "_")}_pipeline.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Move to export step
      setCurrentStep("export")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при скачивании")
    } finally {
      setIsGeneratingZip(false)
    }
  }, [appState, saveProject])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Progress bar section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border rounded-lg mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Автоматическая генерация пайплайнов обработки данных</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Шаг {currentStepIndex + 1} из {steps.length}
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-6xl mx-auto">
          {currentStep === "start" && (
            <div className="space-y-6">
              <div className="text-center space-y-4 py-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    AI Data Engineer
                  </h1>
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Автоматическая генерация пайплайнов обработки данных с помощью искусственного интеллекта
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Анализ данных</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Умные рекомендации</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Готовый код</span>
                  </div>
                </div>
              </div>

              <Card className="border-2">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold">Создание проекта обработки данных</h3>
                      <p className="text-muted-foreground max-w-2xl mx-auto">
                        Следуйте простому пошаговому процессу для создания автоматизированного пайплайна обработки
                        данных
                      </p>
                    </div>

                    {/* Краткая инструкция о предстоящих шагах */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6">
                      <h4 className="font-semibold text-lg mb-4 text-blue-900 dark:text-blue-100">
                        Что вас ждет впереди:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex flex-col items-center space-y-2 text-center">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Шаг 1: Загрузка</p>
                            <p className="text-xs text-muted-foreground">
                              Загрузите данные или настройте подключение к системе
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center space-y-2 text-center">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Шаг 2: Анализ</p>
                            <p className="text-xs text-muted-foreground">
                              ИИ проанализирует данные и даст рекомендации
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center space-y-2 text-center">
                          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                            <Workflow className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Шаг 3: Маппинг</p>
                            <p className="text-xs text-muted-foreground">
                              Настройте соответствие полей и трансформации
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center space-y-2 text-center">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            <Download className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Шаг 4: Экспорт</p>
                            <p className="text-xs text-muted-foreground">Получите готовый код и документацию</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Project Information */}
                    <div className="max-w-md mx-auto space-y-4">
                      <div>
                        <Label htmlFor="project-name" className="text-left block mb-2">
                          Название проекта *
                        </Label>
                        <Input
                          id="project-name"
                          value={appState.projectMeta.name}
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              projectMeta: { ...prev.projectMeta, name: e.target.value },
                            }))
                          }
                          placeholder="Например: Анализ продаж"
                          className="text-center"
                        />
                      </div>

                      <div>
                        <Label htmlFor="project-description" className="text-left block mb-2">
                          Описание проекта
                        </Label>
                        <Textarea
                          id="project-description"
                          value={appState.projectMeta.description}
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              projectMeta: { ...prev.projectMeta, description: e.target.value },
                            }))
                          }
                          placeholder="Краткое описание целей и задач проекта"
                          rows={3}
                        />
                      </div>

                      {/* Data Source Selection */}
                      <div>
                        <Label className="text-left block mb-3">Выберите тип источника данных *</Label>
                        <RadioGroup
                          value="constructor"
                          onValueChange={(value) => {
                            setTrajectory("constructor")
                            setAppState((prev) => ({
                              ...prev,
                              ingest: { ...prev.ingest, mode: "constructor" },
                            }))
                          }}
                          className="space-y-3"
                        >
                          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-primary/5 border-primary">
                            <RadioGroupItem value="constructor" id="constructor" className="mt-1" checked />
                            <div className="flex-1 text-left">
                              <Label htmlFor="constructor" className="font-medium cursor-pointer">
                                Настройка подключения к существующим системам, базам данных и файлам
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Подключение к существующим системам и базам данных
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  CSV
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Excel
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  PostgreSQL
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  ClickHouse
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Kafka
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  HDFS
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={handleNext}
                        disabled={!appState.projectMeta.name.trim()}
                        size="lg"
                        className="px-8"
                      >
                        Начать создание
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === "ingest" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Загрузка данных</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trajectory === "file" ? (
                  <div className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragOver
                          ? "border-primary bg-primary/5"
                          : uploadedFiles.length > 0
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                            : "border-border"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        {uploadedFiles.length > 0 ? "Файлы загружены" : "Перетащите файлы сюда"}
                      </p>
                      <p className="text-muted-foreground mb-4">
                        Поддерживаются форматы: CSV, JSON, XML, Excel
                        <br />
                        <span className="text-sm text-amber-600">
                          ⚠️ CSV/XML/Excel: анализируются первые 10 МБ • JSON: загружается полностью
                        </span>
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".csv,.json,.xml,.xlsx,.xls"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-input"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="file-input" className="cursor-pointer">
                          Выбрать файлы
                        </label>
                      </Button>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Загруженные файлы:</Label>
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatFileSize(file.size)} • {file.type}
                                  {file.size > 10 * 1024 * 1024 && !file.name.toLowerCase().endsWith(".json") && (
                                    <span className="text-amber-600 ml-2">
                                      (анализ: {Math.round(((10 * 1024 * 1024) / file.size) * 100)}%)
                                    </span>
                                  )}
                                  {file.name.toLowerCase().endsWith(".json") && (
                                    <span className="text-green-600 ml-2">(полная загрузка)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}

                        <Button onClick={profileFiles} disabled={isProcessing}>
                          {isProcessing ? "Анализ файла..." : "Проанализировать файл"}
                        </Button>
                      </div>
                    )}

                    {fileProfile && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Профиль данных</CardTitle>
                          {fileProfile.sampleInfo && fileProfile.sampleInfo.percent < 100 && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Выборка может исказить статистики (редкие значения, хвосты). Проанализировано{" "}
                                {fileProfile.sampleInfo.percent.toFixed(1)}% файла.
                              </AlertDescription>
                            </Alert>
                          )}
                          {fileProfile.jsonAnalysis && (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription>
                                JSON файл проанализирован полностью с умным сэмплированием. Структура:{" "}
                                {fileProfile.jsonAnalysis.structure}, Размер: {fileProfile.jsonAnalysis.fileSize},
                                Полей: {fileProfile.jsonAnalysis.estimatedFields}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-sm text-muted-foreground">Формат</Label>
                              <Badge variant="secondary">{fileProfile.format.toUpperCase()}</Badge>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Колонки</Label>
                              <p className="font-medium">{fileProfile.columns.length}</p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">
                                {fileProfile.sampleInfo?.samplingStrategy === "smart-sampling"
                                  ? "Записи (образцы)"
                                  : "Строки (выборка)"}
                              </Label>
                              <p className="font-medium">
                                {fileProfile.sampleRowsCount}
                                {fileProfile.sampleInfo?.totalRecords &&
                                  fileProfile.sampleInfo.totalRecords > fileProfile.sampleRowsCount && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      из {fileProfile.sampleInfo.totalRecords}
                                    </span>
                                  )}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Временные поля</Label>
                              <p className="font-medium">{fileProfile.timeFields.length}</p>
                            </div>
                          </div>

                          {fileProfile.jsonAnalysis && (
                            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium">Высокая точность анализа</span>
                              </div>
                              <Badge variant="secondary">
                                {Math.round(fileProfile.schemaConfidence * 100)}% уверенности
                              </Badge>
                            </div>
                          )}

                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">Схема данных</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {fileProfile.columns.map((col) => (
                                <div key={col} className="flex items-center justify-between p-2 bg-muted rounded">
                                  <span className="font-medium">{col}</span>
                                  <Badge variant="outline">{fileProfile.inferredTypes[col]}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          {fileProfile.timeFields.length > 0 && (
                            <div>
                              <Label className="text-sm text-muted-foreground mb-2 block">Временные поля</Label>
                              <div className="flex flex-wrap gap-2">
                                {fileProfile.timeFields.map((field) => (
                                  <Badge key={field} variant="secondary">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {fileProfile.sampleInfo?.samplingStrategy && (
                            <div>
                              <Label className="text-sm text-muted-foreground mb-2 block">Стратегия анализа</Label>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">
                                  {fileProfile.sampleInfo.samplingStrategy === "smart-sampling"
                                    ? "Умное сэмплирование"
                                    : fileProfile.sampleInfo.samplingStrategy === "full-data"
                                      ? "Полные данные"
                                      : "Стандартная выборка"}
                                </Badge>
                                {fileProfile.sampleInfo.actualSamples && (
                                  <span className="text-xs text-muted-foreground">
                                    {fileProfile.sampleInfo.actualSamples} образцов для анализа
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <StepConstructor
                    onComplete={(config) => {
                      // Store constructor configuration in app state
                      setAppState((prev) => ({
                        ...prev,
                        ingest: {
                          ...prev.ingest,
                          constructorSpec: {
                            source: {
                              type: config.sourcePreset.id,
                              entity:
                                `${config.sourceConfig.schema || config.sourceConfig.database}.${config.sourceConfig.table}` ||
                                config.sourceConfig.topic ||
                                config.sourceConfig.path,
                              config: config.sourceConfig,
                            },
                            target: {
                              type: config.targetPreset.id,
                              entity:
                                `${config.targetConfig.schema || config.targetConfig.database}.${config.targetConfig.table}` ||
                                config.targetConfig.path,
                              config: config.targetConfig,
                              loadPolicy: config.loadMode,
                            },
                            mapping: config.fieldMapping,
                            schedule: config.schedule,
                          },
                        },
                      }))

                      // Auto-proceed to next step
                      handleNext()
                    }}
                  />
                )}

                {trajectory === "file" && (
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                      Назад
                    </Button>
                    <Button onClick={handleNext} disabled={!fileProfile}>
                      Далее
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === "recommendations" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Рекомендации</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Выберите оптимальное решение для хранения данных на основе анализа</CardDescription>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!recommendations && (
                  <div className="text-center py-8">
                    <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">Анализ данных для рекомендаций</p>
                    <p className="text-muted-foreground mb-4">
                      Система проанализирует ваши данные и предложит оптимальные решения для хранения
                    </p>
                    <Button onClick={generateRecommendations} disabled={isGeneratingRecommendations}>
                      {isGeneratingRecommendations ? "Генерация рекомендаций..." : "Получить рекомендации"}
                    </Button>
                  </div>
                )}

                {recommendations && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(recommendations).map(([key, rec]) => (
                        <Card
                          key={key}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedStorage === key ? "ring-2 ring-primary bg-primary/5" : ""
                          }`}
                          onClick={() => selectRecommendation(key as "PostgreSQL" | "ClickHouse" | "HDFS")}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center space-x-2">
                                {key === "PostgreSQL" && <Database className="w-5 h-5 text-blue-600" />}
                                {key === "ClickHouse" && <Zap className="w-5 h-5 text-orange-600" />}
                                {key === "HDFS" && <HardDrive className="w-5 h-5 text-green-600" />}
                                <span>{key}</span>
                              </CardTitle>
                              {selectedStorage === key && <CheckCircle className="w-5 h-5 text-primary" />}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{rec.schedule.frequency}</span>
                              <Badge variant="outline">{rec.loadMode}</Badge>
                            </div>
                            <ul className="text-sm space-y-1">
                              {rec.rationale.slice(0, 3).map((reason, index) => (
                                <li key={index} className="text-muted-foreground">
                                  • {reason}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {selectedStorage && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Настройки для {selectedStorage}</CardTitle>
                          <CardDescription>Настройте параметры загрузки и расписание</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Режим загрузки</Label>
                              <Select
                                value={appState.recommendation?.loadMode}
                                onValueChange={(value) => updateLoadMode(value as "append" | "merge" | "upsert")}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="append">Append - добавление новых записей</SelectItem>
                                  <SelectItem value="merge">Merge - слияние с существующими</SelectItem>
                                  <SelectItem value="upsert">Upsert - обновление или вставка</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Частота обновления</Label>
                              <Select
                                value={appState.recommendation?.schedule.frequency}
                                onValueChange={(value) => updateSchedule(value as "hourly" | "daily" | "weekly")}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hourly">Каждый час</SelectItem>
                                  <SelectItem value="daily">Ежедневно</SelectItem>
                                  <SelectItem value="weekly">Еженедельно</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">Обоснование выбора</Label>
                            <ul className="space-y-1">
                              {recommendations[selectedStorage].rationale.map((reason, index) => (
                                <li key={index} className="text-sm flex items-start space-x-2">
                                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {recommendations[selectedStorage].partitioning && (
                            <div>
                              <Label className="text-sm text-muted-foreground mb-2 block">
                                Стратегия партиционирования
                              </Label>
                              <Badge variant="secondary">
                                {recommendations[selectedStorage].partitioning === "by_date" ? "По дате" : "По ключу"}
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Назад
                  </Button>
                  <Button onClick={handleNext} disabled={!selectedStorage}>
                    Применить и продолжить
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "pipeline" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Workflow className="w-5 h-5" />
                  <span>Конструктор пайплайна</span>
                </CardTitle>
                <CardDescription>
                  Создайте визуальный пайплайн обработки данных: Source → Transform → Target
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <PipelineCanvas
                  nodes={appState.pipeline.nodes}
                  edges={appState.pipeline.edges}
                  onNodesChange={(nodes) =>
                    setAppState((prev) => ({
                      ...prev,
                      pipeline: { ...prev.pipeline, nodes },
                    }))
                  }
                  onEdgesChange={(edges) =>
                    setAppState((prev) => ({
                      ...prev,
                      pipeline: { ...prev.pipeline, edges },
                    }))
                  }
                />

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={handleBack}>
                    Назад
                  </Button>
                  <Button
                    onClick={generatePipelineSpec}
                    disabled={appState.pipeline.nodes.length === 0 || isGeneratingSpec}
                  >
                    {isGeneratingSpec ? "Генерация плана..." : "Сгенерировать план"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "review" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Обзор проекта</span>
                </CardTitle>
                <CardDescription>Просмотрите сгенерированную архитектуру и артефакты перед экспортом</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-6">
                  {/* Project Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Сводка проекта</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Название</Label>
                          <p className="font-medium">{appState.projectMeta.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Хранилище</Label>
                          <Badge variant="secondary">{appState.recommendation?.storage}</Badge>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Режим загрузки</Label>
                          <Badge variant="outline">{appState.recommendation?.loadMode}</Badge>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Расписание</Label>
                          <Badge variant="outline">{appState.recommendation?.schedule.frequency}</Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Описание</Label>
                        <p className="text-sm">{appState.projectMeta.description}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pipeline Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Пайплайн</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4 p-4 bg-muted/20 rounded-lg">
                        {appState.pipeline.nodes.map((node, index) => (
                          <React.Fragment key={node.id}>
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                {node.type === "Source" && <Database className="w-6 h-6 text-blue-600" />}
                                {node.type === "Transform" && <Workflow className="w-6 h-6 text-orange-600" />}
                                {node.type === "Target" && <Database className="w-6 h-6 text-green-600" />}
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-medium">
                                  {node.type === "Source"
                                    ? "Источник"
                                    : node.type === "Target"
                                      ? "Цель"
                                      : node.operator}
                                </p>
                              </div>
                            </div>
                            {index < appState.pipeline.nodes.length - 1 && (
                              <div className="flex-1 h-px bg-border"></div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Artifacts Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Артефакты проекта</CardTitle>
                      <CardDescription>Файлы, которые будут включены в экспорт</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="structure" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="structure">Структура</TabsTrigger>
                          <TabsTrigger value="ddl">DDL</TabsTrigger>
                          <TabsTrigger value="etl">ETL</TabsTrigger>
                          <TabsTrigger value="config">Конфиг</TabsTrigger>
                        </TabsList>

                        <TabsContent value="structure" className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">Структура проекта</span>
                            </div>
                            <ScrollArea className="h-48 w-full border rounded-lg p-4">
                              <div className="space-y-1 text-sm font-mono">
                                <div>📁 {appState.projectMeta.name.replace(/\s+/g, "_")}/</div>
                                <div className="ml-4">📁 ddl/</div>
                                <div className="ml-8">
                                  📄 create_tables_{appState.recommendation?.storage.toLowerCase()}.sql
                                </div>
                                <div className="ml-8">📄 indexes.sql</div>
                                <div className="ml-8">📄 partitions.sql</div>
                                <div className="ml-4">📁 etl/</div>
                                <div className="ml-8">
                                  📄 dag_${appState.projectMeta.name.toLowerCase().replace(/\s+/g, "_")}.py
                                </div>
                                <div className="ml-8">📄 utils_extractor.py</div>
                                <div className="ml-8">📄 utils_loader.py</div>
                                <div className="ml-8">📄 utils_transform.py</div>
                                <div className="ml-4">📁 config/</div>
                                <div className="ml-8">📄 pipeline.yaml</div>
                                <div className="ml-8">📄 .env.sample</div>
                                <div className="ml-4">📁 scripts/</div>
                                <div className="ml-8">📄 run.sh</div>
                                <div className="ml-4">📁 docs/</div>
                                <div className="ml-8">📄 README.md</div>
                                <div className="ml-8">📄 design_report.md</div>
                                <div className="ml-4">📄 requirements.txt</div>
                              </div>
                            </ScrollArea>
                          </div>
                        </TabsContent>

                        <TabsContent value="ddl" className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Database className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">DDL скрипты для {appState.recommendation?.storage}</span>
                            </div>
                            <ScrollArea className="h-48 w-full border rounded-lg p-4">
                              <pre className="text-xs">
                                {`-- ${appState.recommendation?.storage} DDL for ${appState.projectMeta.name}
-- Generated by AI Data Engineer

CREATE TABLE IF NOT EXISTS ${appState.projectMeta.name.toLowerCase().replace(/\s+/g, "_")} (
    id ${appState.recommendation?.storage === "PostgreSQL" ? "SERIAL PRIMARY KEY" : "UInt64"},
    created_at ${appState.recommendation?.storage === "PostgreSQL" ? "TIMESTAMP WITH TIME ZONE DEFAULT NOW()" : "DateTime"},
    updated_at ${appState.recommendation?.storage === "PostgreSQL" ? "TIMESTAMP WITH TIME ZONE DEFAULT NOW()" : "DateTime DEFAULT now()"}
    -- Add your columns here based on data profile
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_${appState.projectMeta.name.toLowerCase().replace(/\s+/g, "_")}_created_at
    ON ${appState.projectMeta.name.toLowerCase().replace(/\s+/g, "_")} (created_at);`}
                              </pre>
                            </ScrollArea>
                          </div>
                        </TabsContent>

                        <TabsContent value="etl" className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Workflow className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">Airflow DAG</span>
                            </div>
                            <ScrollArea className="h-48 w-full border rounded-lg p-4">
                              <pre className="text-xs">
                                {`"""
Airflow DAG for ${appState.projectMeta.name}
Generated by AI Data Engineer
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    '${appState.projectMeta.name.toLowerCase().replace(/\s+/g, "_")}',
    default_args=default_args,
    description='${appState.projectMeta.description}',
    schedule_interval='${appState.recommendation?.schedule.cron}',
    catchup=False,
)`}
                              </pre>
                            </ScrollArea>
                          </div>
                        </TabsContent>

                        <TabsContent value="config" className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Settings className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">Конфигурация пайплайна</span>
                            </div>
                            <ScrollArea className="h-48 w-full border rounded-lg p-4">
                              <pre className="text-xs">
                                {`# Pipeline Configuration for ${appState.projectMeta.name}
# Generated by AI Data Engineer

project:
  name: "${appState.projectMeta.name}"
  description: "${appState.projectMeta.description}"

storage:
  type: "${appState.recommendation?.storage}"
  load_mode: "${appState.recommendation?.loadMode}"
  schedule:
    frequency: "${appState.recommendation?.schedule.frequency}"
    cron: "${appState.recommendation?.schedule.cron}"

pipeline:
  nodes: ${appState.pipeline.nodes.length}
  transformations: ${appState.pipeline.nodes.filter((n) => n.type === "Transform").length}`}
                              </pre>
                            </ScrollArea>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Design Report Preview */}
                  {appState.reportDraft && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Отчет по архитектуре</CardTitle>
                        <CardDescription>Техническая документация проекта</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-64 w-full border rounded-lg p-4">
                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap text-sm">{appState.reportDraft}</pre>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={handleBack}>
                    Назад
                  </Button>
                  <Button onClick={downloadZip} disabled={isGeneratingZip || isSavingProject}>
                    {isGeneratingZip || isSavingProject ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isSavingProject ? "Сохранение..." : "Генерация ZIP..."}
                      </>
                    ) : (
                      <>
                        Завершить и сохранить
                        <Download className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "export" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Экспорт завершен</span>
                </CardTitle>
                <CardDescription>Ваш проект успешно сгенерирован и готов к развертыванию</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                  <h3 className="text-xl font-semibold mb-2">Проект готов!</h3>
                  <p className="text-muted-foreground mb-6">
                    Архитектура данных для "{appState.projectMeta.name}" успешно сгенерирована
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <h4 className="font-medium">DDL скрипты</h4>
                        <p className="text-sm text-muted-foreground">Схемы и индексы</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Workflow className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                        <h4 className="font-medium">ETL пайплайн</h4>
                        <p className="text-sm text-muted-foreground">Airflow DAG</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <h4 className="font-medium">Документация</h4>
                        <p className="text-sm text-muted-foreground">README и отчеты</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Следующие шаги:</h4>
                    <div className="text-left space-y-2 max-w-md mx-auto">
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          1
                        </span>
                        <p className="text-sm">Распакуйте скачанный ZIP архив</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          2
                        </span>
                        <p className="text-sm">Настройте переменные окружения в .env</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          3
                        </span>
                        <p className="text-sm">Выполните DDL скрипты для создания схемы</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          4
                        </span>
                        <p className="text-sm">Разверните Airflow DAG</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-4 mt-8">
                    <Button variant="outline" onClick={() => setCurrentStep("start")}>
                      Новый проект
                    </Button>
                    <Button onClick={downloadZip}>
                      Скачать еще раз
                      <Download className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fallback for undefined steps */}
          {currentStep !== "start" &&
            currentStep !== "ingest" &&
            currentStep !== "recommendations" &&
            currentStep !== "pipeline" &&
            currentStep !== "review" &&
            currentStep !== "export" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {steps[currentStepIndex].icon}
                    <span>{steps[currentStepIndex].title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Шаг "{steps[currentStepIndex].title}" в разработке</CardDescription>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                      Назад
                    </Button>
                    <Button onClick={handleNext} disabled={currentStepIndex >= steps.length - 1}>
                      Далее
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      <div className="bg-white border-t px-4 sm:px-6 lg:px-8 py-4 mt-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => {
              const stepOrder: Step[] = ["start", "ingest", "recommendations", "pipeline", "review", "export"]
              const currentIndex = stepOrder.indexOf(currentStep)
              if (currentIndex > 0) {
                setCurrentStep(stepOrder[currentIndex - 1])
              }
            }}
            disabled={currentStep === "start"}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>

          {error && (
            <div className="flex items-center text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          {currentStep !== "export" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedToNext() || isProcessing || isGeneratingRecommendations || isGeneratingSpec}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing || isGeneratingRecommendations || isGeneratingSpec ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                <>
                  Далее
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
