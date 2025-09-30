"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, MessageSquare, Lightbulb, Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import type { SystemPreset } from "./system-presets"

interface LLMAssistantProps {
  sourcePreset?: SystemPreset
  targetPreset?: SystemPreset
  sourceConfig: Record<string, string>
  targetConfig: Record<string, string>
  onSuggestionApply: (suggestion: {
    type: "config" | "mapping" | "schedule"
    data: any
  }) => void
}

interface LLMSuggestion {
  id: string
  type: "config" | "mapping" | "schedule" | "optimization"
  title: string
  description: string
  confidence: "high" | "medium" | "low"
  data: any
  applied?: boolean
}

export function LLMAssistant({
  sourcePreset,
  targetPreset,
  sourceConfig,
  targetConfig,
  onSuggestionApply,
}: LLMAssistantProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [userQuery, setUserQuery] = useState("")
  const [suggestions, setSuggestions] = useState<LLMSuggestion[]>([])
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])

  const generateSuggestions = async () => {
    if (!sourcePreset || !targetPreset) return

    setIsLoading(true)
    try {
      // Mock LLM API call - in real implementation, this would call Gemini API
      const mockSuggestions: LLMSuggestion[] = [
        {
          id: "config-1",
          type: "config",
          title: "Оптимизация подключения к PostgreSQL",
          description: "Рекомендуется использовать connection pooling для повышения производительности",
          confidence: "high",
          data: {
            targetConfig: {
              ...targetConfig,
              max_connections: "20",
              connection_timeout: "30",
              pool_size: "10",
            },
          },
        },
        {
          id: "mapping-1",
          type: "mapping",
          title: "Автоматическое сопоставление полей",
          description: "Найдены потенциальные соответствия между полями источника и цели",
          confidence: "high",
          data: {
            fieldMapping: [
              { source: "user_id", target: "user_id", transform: "none" },
              { source: "created_at", target: "created_at", transform: "date_trunc" },
              { source: "event_name", target: "event_type", transform: "upper" },
            ],
          },
        },
        {
          id: "schedule-1",
          type: "schedule",
          title: "Оптимальное расписание для ClickHouse",
          description: "Для ClickHouse рекомендуется почасовая загрузка для лучшей производительности",
          confidence: "medium",
          data: {
            schedule: { frequency: "hourly", cron: "0 * * * *" },
            loadMode: "append",
          },
        },
        {
          id: "optimization-1",
          type: "optimization",
          title: "Партиционирование по дате",
          description: "Добавить партиционирование по полю created_at для улучшения запросов",
          confidence: "high",
          data: {
            partitioning: {
              field: "created_at",
              strategy: "monthly",
              retention: "12 months",
            },
          },
        },
      ]

      setSuggestions(mockSuggestions)
    } catch (error) {
      console.error("Error generating suggestions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const askLLM = async () => {
    if (!userQuery.trim()) return

    setIsLoading(true)
    const newUserMessage = { role: "user" as const, content: userQuery }
    setChatHistory((prev) => [...prev, newUserMessage])

    try {
      // Mock LLM response - in real implementation, this would call Gemini API
      const mockResponse = generateMockResponse(userQuery, sourcePreset, targetPreset)

      const assistantMessage = { role: "assistant" as const, content: mockResponse }
      setChatHistory((prev) => [...prev, assistantMessage])
      setUserQuery("")
    } catch (error) {
      console.error("Error asking LLM:", error)
      const errorMessage = {
        role: "assistant" as const,
        content: "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз.",
      }
      setChatHistory((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const applySuggestion = (suggestion: LLMSuggestion) => {
    onSuggestionApply({
      type: suggestion.type,
      data: suggestion.data,
    })

    setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? { ...s, applied: true } : s)))
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
    <div className="space-y-6">
      {/* AI Assistant Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>AI Помощник</span>
          </CardTitle>
          <CardDescription>Получите персонализированные рекомендации и помощь в настройке пайплайна</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button onClick={generateSuggestions} disabled={isLoading || !sourcePreset || !targetPreset}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Анализ...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Получить рекомендации
                </>
              )}
            </Button>
            {!sourcePreset || !targetPreset ? (
              <Alert className="flex-1">
                <AlertDescription className="text-sm">
                  Выберите источник и цель для получения персонализированных рекомендаций
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Рекомендации AI</CardTitle>
            <CardDescription>Персонализированные предложения для вашего пайплайна</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-4 border rounded-lg ${suggestion.applied ? "bg-green-50 border-green-200" : "bg-background"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{suggestion.title}</h4>
                        <Badge variant="outline" className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                          {getConfidenceIcon(suggestion.confidence)}
                          <span className="ml-1">
                            {suggestion.confidence === "high"
                              ? "Высокая"
                              : suggestion.confidence === "medium"
                                ? "Средняя"
                                : "Низкая"}
                          </span>
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.type === "config"
                            ? "Конфигурация"
                            : suggestion.type === "mapping"
                              ? "Маппинг"
                              : suggestion.type === "schedule"
                                ? "Расписание"
                                : "Оптимизация"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>

                      {/* Preview of changes */}
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <strong>Изменения:</strong>
                        <pre className="mt-1 text-xs">{JSON.stringify(suggestion.data, null, 2).slice(0, 200)}...</pre>
                      </div>
                    </div>

                    <div className="ml-4">
                      {suggestion.applied ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Применено
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => applySuggestion(suggestion)}>
                          Применить
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Чат с AI</span>
          </CardTitle>
          <CardDescription>Задайте вопросы о настройке пайплайна</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chat History */}
            {chatHistory.length > 0 && (
              <ScrollArea className="h-64 w-full border rounded-lg p-4">
                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Chat Input */}
            <div className="flex space-x-2">
              <div className="flex-1">
                <Textarea
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Спросите AI о настройке пайплайна, оптимизации производительности или лучших практиках..."
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

            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2">
              <Label className="text-sm text-muted-foreground">Быстрые вопросы:</Label>
              {[
                "Как оптимизировать производительность?",
                "Какое расписание лучше выбрать?",
                "Нужно ли партиционирование?",
                "Как настроить мониторинг?",
              ].map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-transparent"
                  onClick={() => setUserQuery(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Mock response generator
function generateMockResponse(query: string, sourcePreset?: SystemPreset, targetPreset?: SystemPreset): string {
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes("производительность") || lowerQuery.includes("оптимизация")) {
    return `Для оптимизации производительности пайплайна ${sourcePreset?.name} → ${targetPreset?.name} рекомендую:

1. **Батчинг**: Обрабатывайте данные пакетами по 1000-5000 записей
2. **Индексы**: Создайте индексы на поля, используемые для JOIN и WHERE
3. **Партиционирование**: Разделите данные по времени или ключевым полям
4. **Connection Pooling**: Используйте пул соединений для базы данных
5. **Мониторинг**: Настройте метрики для отслеживания производительности

Хотите, чтобы я создал конкретные рекомендации для вашей конфигурации?`
  }

  if (lowerQuery.includes("расписание") || lowerQuery.includes("частота")) {
    return `Выбор расписания зависит от ваших требований:

**Для ${targetPreset?.name}:**
- **Hourly**: Подходит для real-time аналитики, высокая нагрузка
- **Daily**: Оптимально для большинства ETL процессов
- **Weekly**: Для архивных данных и отчетности

**Рекомендация**: Начните с ежедневной загрузки в 02:00, когда нагрузка минимальна. Можете увеличить частоту при необходимости.`
  }

  if (lowerQuery.includes("партиционирование") || lowerQuery.includes("partition")) {
    return `Партиционирование поможет улучшить производительность:

**Для ${targetPreset?.name}:**
- **По времени**: Если есть временные поля (created_at, event_time)
- **По ключу**: Для равномерного распределения данных
- **Гибридное**: Комбинация времени и ключа

**Преимущества:**
- Быстрые запросы по диапазонам
- Параллельная обработка
- Простое удаление старых данных

Рекомендую партиционирование по месяцам для временных данных.`
  }

  if (lowerQuery.includes("мониторинг") || lowerQuery.includes("monitoring")) {
    return `Настройка мониторинга критически важна:

**Ключевые метрики:**
- Время выполнения пайплайна
- Количество обработанных записей
- Ошибки и исключения
- Использование ресурсов (CPU, память)

**Инструменты:**
- Airflow UI для статуса DAG
- Prometheus + Grafana для метрик
- Логирование в ELK Stack
- Алерты в Slack/Email

**Пороги для алертов:**
- Время выполнения > 2x от среднего
- Ошибки > 5% от общего объема
- Отсутствие данных > 2 часа`
  }

  // Default response
  return `Понял ваш вопрос о "${query}". 

Для пайплайна ${sourcePreset?.name} → ${targetPreset?.name} могу предложить следующие рекомендации:

1. Убедитесь, что все соединения настроены корректно
2. Проверьте соответствие схем данных
3. Настройте обработку ошибок и retry логику
4. Добавьте логирование для отладки

Если у вас есть более конкретные вопросы о конфигурации, маппинге полей или оптимизации - задавайте, я помогу!`
}
