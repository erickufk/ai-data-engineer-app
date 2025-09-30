"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Sparkles,
  Send,
  Loader2,
  Database,
  FileText,
  Zap,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Info,
} from "lucide-react"
import type { SystemPreset } from "./system-presets"

interface UnifiedAIChatProps {
  sourcePreset?: SystemPreset
  targetPreset?: SystemPreset
  sourceConfig: Record<string, string>
  targetConfig: Record<string, string>
  onSuggestionApply: (suggestion: {
    type: "config" | "mapping" | "schedule"
    data: any
  }) => void
  onSystemSelect?: (type: "source" | "target", preset: SystemPreset) => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  recommendations?: LLMRecommendation[]
}

interface LLMRecommendation {
  id: string
  type: "config" | "mapping" | "schedule" | "optimization" | "monitoring" | "security"
  title: string
  description: string
  confidence: "high" | "medium" | "low"
  details: string[]
}

const SYSTEM_PRESETS: SystemPreset[] = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    icon: <Database className="w-4 h-4" />,
    description: "Реляционная база данных",
    category: "database",
    fields: [],
    examples: {},
    validation: {},
  },
  {
    id: "clickhouse",
    name: "ClickHouse",
    icon: <Zap className="w-4 h-4" />,
    description: "Колоночная OLAP база",
    category: "database",
    fields: [],
    examples: {},
    validation: {},
  },
  {
    id: "hdfs",
    name: "HDFS",
    icon: <HardDrive className="w-4 h-4" />,
    description: "Распределенная файловая система",
    category: "storage",
    fields: [],
    examples: {},
    validation: {},
  },
  {
    id: "kafka",
    name: "Kafka",
    icon: <Zap className="w-4 h-4" />,
    description: "Потоковая обработка",
    category: "streaming",
    fields: [],
    examples: {},
    validation: {},
  },
  {
    id: "file",
    name: "File",
    icon: <FileText className="w-4 h-4" />,
    description: "Файловая система",
    category: "storage",
    fields: [],
    examples: {},
    validation: {},
  },
]

export function UnifiedAIChat({
  sourcePreset,
  targetPreset,
  sourceConfig,
  targetConfig,
  onSuggestionApply,
  onSystemSelect,
}: UnifiedAIChatProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [userQuery, setUserQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [selectedSource, setSelectedSource] = useState<SystemPreset | undefined>(sourcePreset)
  const [selectedTarget, setSelectedTarget] = useState<SystemPreset | undefined>(targetPreset)

  const handleSystemSelect = (type: "source" | "target", preset: SystemPreset) => {
    if (type === "source") {
      setSelectedSource(preset)
    } else {
      setSelectedTarget(preset)
    }

    const contextMessage = `Выбрана система ${type === "source" ? "источник" : "цель"}: ${preset.name}. Как лучше настроить интеграцию?`
    setUserQuery(contextMessage)

    onSystemSelect?.(type, preset)
  }

  const askLLM = async () => {
    if (!userQuery.trim()) return

    setIsLoading(true)
    const newUserMessage: ChatMessage = { role: "user", content: userQuery }
    setChatHistory((prev) => [...prev, newUserMessage])

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userQuery,
          context: {
            sourcePreset: selectedSource,
            targetPreset: selectedTarget,
            sourceConfig,
            targetConfig,
          },
          chatHistory: chatHistory,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get LLM response")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const recommendations = generateRecommendations(userQuery, selectedSource, selectedTarget)

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response,
        recommendations: recommendations.length > 0 ? recommendations : undefined,
      }

      setChatHistory((prev) => [...prev, assistantMessage])
      setUserQuery("")
    } catch (error) {
      console.error("Error asking LLM:", error)
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз.",
      }
      setChatHistory((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const applySuggestion = (suggestion: any) => {
    onSuggestionApply({
      type: suggestion.type,
      data: suggestion.data,
    })

    setChatHistory((prev) =>
      prev.map((message) => ({
        ...message,
        recommendations: message.recommendations?.map((r) => (r.id === suggestion.id ? { ...r, applied: true } : r)),
      })),
    )
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-green-600 bg-green-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      case "low":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <CheckCircle className="w-4 h-4" />
      case "medium":
        return <AlertTriangle className="w-4 h-4" />
      case "low":
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Lightbulb className="w-4 h-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span>AI Консультант</span>
        </CardTitle>
        <CardDescription>
          Выберите системы и получите персонализированные рекомендации по настройке пайплайна
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Быстрый выбор систем:</span>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Источник:</span>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_PRESETS.map((preset) => (
                <Button
                  key={`source-${preset.id}`}
                  variant={selectedSource?.id === preset.id ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => handleSystemSelect("source", preset)}
                >
                  {preset.icon}
                  <span className="ml-1 text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Цель:</span>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_PRESETS.map((preset) => (
                <Button
                  key={`target-${preset.id}`}
                  variant={selectedTarget?.id === preset.id ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => handleSystemSelect("target", preset)}
                >
                  {preset.icon}
                  <span className="ml-1 text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {(selectedSource || selectedTarget) && (
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center space-x-4 text-sm">
                {selectedSource && (
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Источник:</span>
                    {selectedSource.icon}
                    <span className="font-medium">{selectedSource.name}</span>
                  </div>
                )}
                {selectedSource && selectedTarget && <span className="text-muted-foreground">→</span>}
                {selectedTarget && (
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Цель:</span>
                    {selectedTarget.icon}
                    <span className="font-medium">{selectedTarget.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          {chatHistory.length > 0 && (
            <ScrollArea className="h-80 w-full border rounded-lg p-4">
              <div className="space-y-4">
                {chatHistory.map((message, index) => (
                  <div key={index} className="space-y-3">
                    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`p-3 rounded-lg ${
                          message.role === "user"
                            ? "max-w-[60%] bg-primary text-primary-foreground"
                            : "max-w-[60%] bg-muted text-foreground"
                        }`}
                      >
                        {message.role === "user" ? (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-headings:my-3"
                            components={{
                              code: ({ node, inline, className, children, ...props }: any) => {
                                return inline ? (
                                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                    {children}
                                  </code>
                                ) : (
                                  <code
                                    className="block bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                )
                              },
                              a: ({ node, children, ...props }: any) => (
                                <a
                                  className="text-primary hover:underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  {...props}
                                >
                                  {children}
                                </a>
                              ),
                              ul: ({ node, children, ...props }: any) => (
                                <ul className="list-disc list-inside space-y-1" {...props}>
                                  {children}
                                </ul>
                              ),
                              ol: ({ node, children, ...props }: any) => (
                                <ol className="list-decimal list-inside space-y-1" {...props}>
                                  {children}
                                </ol>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>

                    {message.recommendations && message.recommendations.length > 0 && (
                      <div className="ml-4 space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Lightbulb className="w-4 h-4" />
                          <span className="font-medium">Рекомендации:</span>
                        </div>
                        {message.recommendations.map((recommendation) => (
                          <div
                            key={recommendation.id}
                            className="p-3 border rounded-lg text-sm bg-blue-50/50 border-blue-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="font-medium text-sm">{recommendation.title}</span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getConfidenceColor(recommendation.confidence)}`}
                                  >
                                    {getConfidenceIcon(recommendation.confidence)}
                                    <span className="ml-1">
                                      {recommendation.confidence === "high"
                                        ? "Высокая"
                                        : recommendation.confidence === "medium"
                                          ? "Средняя"
                                          : "Низкая"}
                                    </span>
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{recommendation.description}</p>
                                <ul className="text-xs space-y-1">
                                  {recommendation.details.map((detail, idx) => (
                                    <li key={idx} className="flex items-start space-x-2">
                                      <span className="text-blue-600 mt-0.5">•</span>
                                      <span>{detail}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="ml-2">
                                <Badge variant="secondary" className="text-xs">
                                  <Info className="w-3 h-3 mr-1" />
                                  Совет
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex space-x-2">
            <div className="flex-1">
              <Textarea
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Спросите AI о настройке пайплайна, оптимизации или лучших практиках..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    askLLM()
                  }
                }}
              />
            </div>
            <Button onClick={askLLM} disabled={isLoading || !userQuery.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Быстрые вопросы:</span>
            <div className="flex flex-wrap gap-2">
              {[
                "Как оптимизировать производительность?",
                "Какое расписание лучше выбрать?",
                "Нужно ли партиционирование?",
                "Как настроить мониторинг?",
                "Какие индексы создать?",
                "Как обеспечить отказоустойчивость?",
                "Стратегии обработки ошибок?",
                "Настройка безопасности?",
                "Масштабирование пайплайна?",
                "Лучшие практики ETL?",
                "Как тестировать пайплайн?",
                "Оптимизация памяти?",
              ].map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-3 bg-transparent hover:bg-muted"
                  onClick={() => setUserQuery(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function generateRecommendations(query: string, source?: SystemPreset, target?: SystemPreset): LLMRecommendation[] {
  if (!source || !target) return []

  const recommendations: LLMRecommendation[] = []
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes("производительность") || lowerQuery.includes("оптимизация")) {
    recommendations.push({
      id: "performance-optimization",
      type: "optimization",
      title: "Оптимизация производительности",
      description: "Комплексные рекомендации для повышения скорости обработки данных",
      confidence: "high",
      details: [
        "Используйте батчинг для группировки операций (размер батча: 1000-5000 записей)",
        "Настройте connection pooling (рекомендуемый размер пула: 10-20 соединений)",
        "Создайте индексы на часто используемые поля для ускорения запросов",
        "Рассмотрите партиционирование больших таблиц по дате или другим критериям",
        "Мониторьте использование памяти и CPU во время выполнения пайплайна",
      ],
    })
  }

  if (lowerQuery.includes("мониторинг") || lowerQuery.includes("отслеживание")) {
    recommendations.push({
      id: "monitoring-setup",
      type: "monitoring",
      title: "Настройка мониторинга",
      description: "Ключевые метрики и алерты для контроля работы пайплайна",
      confidence: "high",
      details: [
        "Отслеживайте время выполнения каждого этапа пайплайна",
        "Настройте алерты на превышение времени выполнения (SLA)",
        "Мониторьте количество обработанных и пропущенных записей",
        "Контролируйте использование ресурсов (CPU, память, дисковое пространство)",
        "Логируйте ошибки с детальной информацией для быстрой диагностики",
      ],
    })
  }

  if (lowerQuery.includes("расписание") || lowerQuery.includes("частота")) {
    recommendations.push({
      id: "schedule-optimization",
      type: "schedule",
      title: "Оптимальное расписание",
      description: "Рекомендации по частоте и времени запуска пайплайна",
      confidence: "medium",
      details: [
        "Для больших объемов данных: запуск 1-2 раза в день в непиковые часы",
        "Для критичных данных: каждые 15-30 минут с инкрементальной загрузкой",
        "Учитывайте время обновления данных в источнике",
        "Настройте retry-политику для обработки временных сбоев",
        "Используйте cron-выражения для точного контроля времени запуска",
      ],
    })
  }

  if (target.name === "PostgreSQL") {
    recommendations.push({
      id: "postgresql-config",
      type: "config",
      title: "Настройка PostgreSQL",
      description: "Специфичные рекомендации для целевой базы PostgreSQL",
      confidence: "high",
      details: [
        "Настройте work_mem для оптимизации сортировки и группировки",
        "Увеличьте shared_buffers до 25% от доступной RAM",
        "Используйте COPY вместо INSERT для массовой загрузки данных",
        "Настройте автовакуум для поддержания производительности",
        "Создайте составные индексы для сложных запросов",
      ],
    })
  }

  return recommendations
}

function generateContextualResponse(query: string, source?: SystemPreset, target?: SystemPreset): string {
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes("выбрана система")) {
    if (source && target) {
      return `Отличный выбор! Пайплайн ${source.name} → ${target.name} имеет свои особенности:\n\n**Рекомендации:**\n- Настройте connection pooling для оптимальной производительности\n- Используйте батчинг для обработки данных\n- Настройте мониторинг ключевых метрик\n\nЧто именно вас интересует в настройке этого пайплайна?`
    } else if (source || target) {
      const system = source || target
      const type = source ? "источника" : "цели"
      return `Хороший выбор ${system?.name} в качестве ${type}! Теперь выберите ${source ? "целевую систему" : "источник данных"} для получения персонализированных рекомендаций по интеграции.`
    }
  }

  if (lowerQuery.includes("производительность") || lowerQuery.includes("оптимизация")) {
    return `Для оптимизации производительности пайплайна ${source?.name || "источник"} → ${target?.name || "цель"} рекомендую:\n\n1. **Батчинг**: Обрабатывайте данные пакетами\n2. **Индексы**: Создайте индексы на ключевые поля\n3. **Партиционирование**: Разделите данные логически\n4. **Connection Pooling**: Используйте пул соединений\n5. **Мониторинг**: Отслеживайте метрики производительности`
  }

  return `Понял ваш вопрос. ${source && target ? `Для пайплайна ${source.name} → ${target.name}` : "Для вашего пайплайна"} могу предложить конкретные рекомендации по настройке, оптимизации и лучшим практикам. Что именно вас интересует?`
}
