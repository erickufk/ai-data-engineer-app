"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, CheckCircle, AlertCircle, Info, Database, ArrowRight, Sparkles } from "lucide-react"

interface FileAnalysisResult {
  deepProfile: {
    format: string
    encoding: string
    delimiter: string
    headerPresent: boolean
    schema: {
      fields: Array<{
        name: string
        type: string
        nullable: boolean
        example: string
      }>
      primaryKeyCandidates: string[][]
      businessKeyCandidates: string[][]
      timeField: string | null
      timezone: string | null
    }
    quality: {
      rowCountSampled: number
      missingShareByField: Record<string, number>
      duplicatesShare: number
      mixedTypeFields: string[]
      outlierFields: string[]
      piiFlags: string[]
    }
    temporal: {
      granularity: string | null
      regularity: string | null
      monotonicIncrease: boolean
    }
    categorical: {
      highCardinality: string[]
      lowCardinality: Array<{
        field: string
        top: string[]
      }>
    }
    sampling: {
      sampleBytes: number
      originalSizeBytes: number
      schemaConfidence: number
      notes: string[]
    }
  }
  recommendation: {
    targetStorage: string
    rationale: string[]
    ddlStrategy: {
      partitions: {
        type: string | null
        field: string | null
        granularity: string | null
      }
      orderBy: string[]
      indexes: Array<{
        fields: string[]
        type: string | null
      }>
    }
    loadPolicy: {
      mode: string
      dedupKeys: string[]
      watermark: {
        field: string | null
        delay: string
      }
    }
    schedule: {
      frequency: string
      cron: string
      slaNote: string | null
    }
    suggestedTransforms: Array<{
      operator: string
      params: Record<string, any>
    }>
  }
  reportMarkdown: string
  proposedSpec: any
}

interface FilePreviewAnalysisProps {
  onAnalysisComplete: (result: FileAnalysisResult) => void
  onBack: () => void
}

export function FilePreviewAnalysis({ onAnalysisComplete, onBack }: FilePreviewAnalysisProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<FileAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setAnalysisResult(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    setIsAnalyzing(true)
    setError(null)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const formData = new FormData()
      formData.append("file", file)
      formData.append(
        "project",
        JSON.stringify({
          name: "File Analysis Project",
          description: "Automated file analysis for data pipeline",
        }),
      )

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.deepProfile) {
        setAnalysisResult(result)
      } else {
        throw new Error("Invalid analysis result format")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
      console.error("[v0] File analysis error:", err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSaveAndContinue = () => {
    if (analysisResult) {
      onAnalysisComplete(analysisResult)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Предварительный анализ файла</span>
          </CardTitle>
          <CardDescription>
            Загрузите файл для автоматического анализа структуры и получения рекомендаций по обработке данных
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          {!file && (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Выберите файл для анализа</h3>
                <p className="text-sm text-muted-foreground">Поддерживаются форматы: CSV, JSON, XML, NDJSON</p>
                <input
                  type="file"
                  accept=".csv,.json,.xml,.ndjson,.jsonl"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer bg-transparent" asChild>
                    <span>Выбрать файл</span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {/* File Info */}
          {file && !analysisResult && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium">{file.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} • {file.type || "Unknown type"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                      Изменить
                    </Button>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4" />
                      <span>{isAnalyzing ? "Анализируем..." : "Анализировать"}</span>
                    </Button>
                  </div>
                </div>

                {isAnalyzing && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Прогресс анализа</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="space-y-6">
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Анализ завершен</span>
                  </CardTitle>
                  <CardDescription>
                    Обнаружено {analysisResult.deepProfile.schema.fields.length} полей, проанализировано{" "}
                    {formatFileSize(analysisResult.deepProfile.sampling.sampleBytes)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="schema" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="schema">Схема</TabsTrigger>
                      <TabsTrigger value="quality">Качество</TabsTrigger>
                      <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
                      <TabsTrigger value="report">Отчет</TabsTrigger>
                    </TabsList>

                    <TabsContent value="schema" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Основная информация</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Формат:</span>
                              <Badge variant="outline">{analysisResult.deepProfile.format}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Кодировка:</span>
                              <span>{analysisResult.deepProfile.encoding}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Разделитель:</span>
                              <span className="font-mono">{analysisResult.deepProfile.delimiter}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Заголовки:</span>
                              <span>{analysisResult.deepProfile.headerPresent ? "Да" : "Нет"}</span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Временные данные</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {analysisResult.deepProfile.schema.timeField ? (
                              <>
                                <div className="flex justify-between">
                                  <span>Поле времени:</span>
                                  <Badge variant="secondary">{analysisResult.deepProfile.schema.timeField}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span>Гранулярность:</span>
                                  <span>{analysisResult.deepProfile.temporal.granularity || "Не определена"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Регулярность:</span>
                                  <span>{analysisResult.deepProfile.temporal.regularity || "Не определена"}</span>
                                </div>
                              </>
                            ) : (
                              <p className="text-muted-foreground">Временные поля не обнаружены</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Поля данных</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analysisResult.deepProfile.schema.fields.map((field, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium">{field.name}</span>
                                  <Badge variant="outline">{field.type}</Badge>
                                  {!field.nullable && (
                                    <Badge variant="secondary" className="text-xs">
                                      NOT NULL
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground font-mono">{field.example}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="quality" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Статистика качества</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Строк проанализировано:</span>
                              <span>{analysisResult.deepProfile.quality.rowCountSampled.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Дубликаты:</span>
                              <span>{(analysisResult.deepProfile.quality.duplicatesShare * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Уверенность схемы:</span>
                              <span>{(analysisResult.deepProfile.sampling.schemaConfidence * 100).toFixed(1)}%</span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Проблемы данных</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {analysisResult.deepProfile.quality.mixedTypeFields.length > 0 && (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Смешанные типы: {analysisResult.deepProfile.quality.mixedTypeFields.join(", ")}
                                </AlertDescription>
                              </Alert>
                            )}
                            {analysisResult.deepProfile.quality.piiFlags.length > 0 && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  Обнаружены PII данные: {analysisResult.deepProfile.quality.piiFlags.join(", ")}
                                </AlertDescription>
                              </Alert>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {Object.keys(analysisResult.deepProfile.quality.missingShareByField).length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Пропущенные значения по полям</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Object.entries(analysisResult.deepProfile.quality.missingShareByField).map(
                                ([field, share]) => (
                                  <div key={field} className="flex items-center justify-between">
                                    <span>{field}</span>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={share * 100} className="w-20" />
                                      <span className="text-sm">{(share * 100).toFixed(1)}%</span>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="recommendations" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <Database className="w-4 h-4" />
                            <span>Рекомендуемое хранилище: {analysisResult.recommendation.targetStorage}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Обоснование:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {analysisResult.recommendation.rationale.map((reason, index) => (
                                <li key={index}>{reason}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Стратегия загрузки:</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Режим:</span>{" "}
                                {analysisResult.recommendation.loadPolicy.mode}
                              </div>
                              <div>
                                <span className="font-medium">Расписание:</span>{" "}
                                {analysisResult.recommendation.schedule.frequency}
                              </div>
                            </div>
                          </div>

                          {analysisResult.recommendation.suggestedTransforms.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Рекомендуемые трансформации:</h4>
                              <div className="space-y-2">
                                {analysisResult.recommendation.suggestedTransforms.map((transform, index) => (
                                  <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded">
                                    <Badge variant="outline">{transform.operator}</Badge>
                                    <span className="text-sm">{JSON.stringify(transform.params)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="report" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Аналитический отчет</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-sm">{analysisResult.reportMarkdown}</div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                  Назад
                </Button>
                <Button onClick={handleSaveAndContinue} className="flex items-center space-x-2">
                  <span>Сохранить и продолжить</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
