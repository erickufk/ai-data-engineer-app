"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock, Calendar, Zap, Info, Key, AlertCircle, Plus, X, HelpCircle, CheckCircle2 } from "lucide-react"
import type { SystemPreset } from "./system-presets"
import type { LoadPolicy, Schedule } from "@/lib/types"
import { useState, useEffect } from "react"

interface ScheduleConfigProps {
  schedule: Schedule
  loadMode: string
  loadPolicy?: LoadPolicy
  onScheduleChange: (schedule: Schedule) => void
  onLoadModeChange: (loadMode: string) => void
  onLoadPolicyChange?: (loadPolicy: LoadPolicy) => void
  targetPreset?: SystemPreset
  targetFields?: string[]
  timeField?: string
}

const schedulePresets = [
  { value: "hourly", label: "Каждый час", cron: "0 * * * *", iconType: "zap" },
  { value: "daily", label: "Ежедневно в 02:00", cron: "0 2 * * *", iconType: "calendar" },
  { value: "weekly", label: "Еженедельно (Пн в 03:00)", cron: "0 3 * * 1", iconType: "calendar" },
]

const renderPresetIcon = (iconType: string) => {
  switch (iconType) {
    case "zap":
      return <Zap className="w-4 h-4" />
    case "calendar":
      return <Calendar className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

export function ScheduleConfig({
  schedule,
  loadMode,
  loadPolicy,
  onScheduleChange,
  onLoadModeChange,
  onLoadPolicyChange,
  targetPreset,
  targetFields = [],
  timeField,
}: ScheduleConfigProps) {
  const [localSchedule, setLocalSchedule] = useState<Schedule>({
    ...schedule,
    retries: schedule.retries || { count: 2, delaySec: 300 },
    catchup: schedule.catchup || { enabled: false },
  })

  const [localLoadPolicy, setLocalLoadPolicy] = useState<LoadPolicy>(
    loadPolicy || {
      mode: (loadMode || "append") as "append" | "merge" | "upsert",
      dedupKeys: [],
      conflictStrategy: "last-wins",
      createUniqueIndex: false,
      orderBy: [],
      timestampOrder: "desc",
    },
  )

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [selectedDedupKey, setSelectedDedupKey] = useState<string>("")

  useEffect(() => {
    onScheduleChange(localSchedule)
  }, [localSchedule, onScheduleChange])

  useEffect(() => {
    if (onLoadPolicyChange) {
      onLoadPolicyChange(localLoadPolicy)
    }
  }, [localLoadPolicy, onLoadPolicyChange])

  useEffect(() => {
    const errors: string[] = []

    if (
      (loadMode === "merge" || loadMode === "upsert") &&
      (!localLoadPolicy.dedupKeys || localLoadPolicy.dedupKeys.length === 0)
    ) {
      errors.push("Для режимов merge и upsert необходимо указать ключи дедупликации.")
    }

    if (
      (loadMode === "merge" || loadMode === "upsert") &&
      localLoadPolicy.conflictStrategy === "last-wins" &&
      !localLoadPolicy.timestampField &&
      !localLoadPolicy.versionField
    ) {
      errors.push("Для политики last-wins укажите поле времени или версию.")
    }

    if (localLoadPolicy.partitioning?.type === "by_date" && !timeField && !localLoadPolicy.timestampField) {
      errors.push(
        "Партиционирование по дате невозможно: отсутствует timeField. Измените стратегию или укажите поле времени.",
      )
    }

    if (localLoadPolicy.watermark?.field && !timeField && !localLoadPolicy.timestampField) {
      errors.push("Watermark требует указания поля времени.")
    }

    setValidationErrors(errors)
  }, [loadMode, localLoadPolicy, timeField])

  const handleLoadModeChange = (newMode: string) => {
    onLoadModeChange(newMode)
    setLocalLoadPolicy((prev) => ({
      ...prev,
      mode: newMode as "append" | "merge" | "upsert",
      dedupKeys: newMode === "append" ? [] : prev.dedupKeys,
    }))
  }

  const updateLoadPolicy = (updates: Partial<LoadPolicy>) => {
    setLocalLoadPolicy((prev) => ({ ...prev, ...updates }))
  }

  const updateSchedule = (updates: Partial<Schedule>) => {
    setLocalSchedule((prev) => ({ ...prev, ...updates }))
  }

  const addDedupKey = () => {
    if (selectedDedupKey && !localLoadPolicy.dedupKeys?.includes(selectedDedupKey)) {
      updateLoadPolicy({
        dedupKeys: [...(localLoadPolicy.dedupKeys || []), selectedDedupKey],
      })
      setSelectedDedupKey("")
    }
  }

  const removeDedupKey = (key: string) => {
    updateLoadPolicy({
      dedupKeys: localLoadPolicy.dedupKeys?.filter((k) => k !== key) || [],
    })
  }

  const getScheduleRecommendation = () => {
    if (!targetPreset) return null

    switch (targetPreset.id) {
      case "clickhouse":
        return {
          frequency: "hourly",
          reason: "часто hourly с партиционированием by_date",
          badge: "рекомендуем hourly",
        }
      case "postgresql":
        return {
          frequency: "daily",
          reason: "рекомендуем daily крупными батчами",
          badge: "рекомендуем daily",
        }
      case "hdfs":
        return {
          frequency: "daily",
          reason: "обычно daily для крупных файлов",
          badge: "рекомендуем daily",
        }
      default:
        return null
    }
  }

  const getNextExecutions = () => {
    const now = new Date()
    const executions: string[] = []

    // Simple calculation based on frequency
    for (let i = 1; i <= 3; i++) {
      const next = new Date(now)
      if (localSchedule.frequency === "hourly") {
        next.setHours(now.getHours() + i)
      } else if (localSchedule.frequency === "daily") {
        next.setDate(now.getDate() + i)
        next.setHours(2, 0, 0, 0)
      } else if (localSchedule.frequency === "weekly") {
        next.setDate(now.getDate() + i * 7)
        next.setHours(3, 0, 0, 0)
      }
      executions.push(
        next.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      )
    }

    return executions
  }

  const recommendation = getScheduleRecommendation()
  const showAdvancedConfig = loadMode === "merge" || loadMode === "upsert"
  const nextExecutions = getNextExecutions()

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Необходимо исправить следующие ошибки:</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validationErrors.length === 0 && loadMode === "append" && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Режим append настроен корректно. Данные будут добавляться без проверки дубликатов.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Indicator for merge/upsert */}
        {validationErrors.length === 0 &&
          showAdvancedConfig &&
          localLoadPolicy.dedupKeys &&
          localLoadPolicy.dedupKeys.length > 0 && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Конфигурация валидна. Все обязательные параметры указаны корректно.
              </AlertDescription>
            </Alert>
          )}

        {/* Load Mode Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Режим загрузки данных</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-medium mb-1">Режимы загрузки:</p>
                  <ul className="text-xs space-y-1">
                    <li>
                      <strong>Append:</strong> Добавление без проверки дубликатов
                    </li>
                    <li>
                      <strong>Merge:</strong> Обновление существующих записей по ключам
                    </li>
                    <li>
                      <strong>Upsert:</strong> Атомарная вставка/обновление (PostgreSQL)
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>Выберите стратегию загрузки данных в целевую систему</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={loadMode} onValueChange={handleLoadModeChange}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="append" id="append" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="append" className="font-medium cursor-pointer">
                      Append — Только добавление новых строк
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Все записи добавляются в конец таблицы без проверки дубликатов
                    </p>
                    {targetPreset?.id === "hdfs" && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Единственный режим для HDFS
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="merge" id="merge" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="merge" className="font-medium cursor-pointer">
                      Merge — Слияние по ключам
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Новые записи вставляются, существующие обновляются или заменяются
                    </p>
                    {(targetPreset?.id === "postgresql" || targetPreset?.id === "clickhouse") && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Рекомендуется для {targetPreset.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="upsert" id="upsert" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="upsert" className="font-medium cursor-pointer">
                      Upsert — Вставка или обновление по ключу
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Для PostgreSQL — ON CONFLICT. Атомарная операция вставки/обновления
                    </p>
                    {targetPreset?.id === "postgresql" && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Оптимально для PostgreSQL
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </RadioGroup>

            {showAdvancedConfig && (
              <Card className="border-2 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Key className="w-4 h-4" />
                    <span>Ключи дедупликации и политика обновления</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md">
                        <div className="space-y-2 text-xs">
                          <p className="font-medium">Что такое ключи дедупликации?</p>
                          <p>
                            Поля, которые однозначно идентифицируют запись в таблице. Используются для определения,
                            является ли запись новой или уже существует.
                          </p>

                          <p className="font-medium mt-2">Как выбрать правильные ключи:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>ID пользователя, заказа, транзакции</li>
                            <li>Уникальные идентификаторы (UUID, GUID)</li>
                            <li>Комбинация полей (user_id + date)</li>
                            <li>Естественные ключи (email, phone)</li>
                          </ul>

                          <p className="font-medium mt-2 text-amber-600">⚠️ Неправильный выбор приведет к:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Дублированию данных</li>
                            <li>Потере обновлений</li>
                            <li>Некорректным результатам</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>Обязательные параметры для режима {loadMode}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span>Ключи дедупликации</span>
                      <Badge variant="destructive" className="text-xs">
                        Обязательно
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-blue-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Выберите поля, которые уникально идентифицируют каждую запись. Можно выбрать несколько полей
                            для составного ключа.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="flex space-x-2">
                      <Select value={selectedDedupKey} onValueChange={setSelectedDedupKey}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Выберите поле для добавления" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetFields.length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground">
                              Сначала настройте маппинг полей на шаге 3
                            </div>
                          )}
                          {targetFields
                            .filter((field) => !localLoadPolicy.dedupKeys?.includes(field))
                            .map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
                                {(field.toLowerCase().includes("id") ||
                                  field.toLowerCase().includes("key") ||
                                  field.toLowerCase().includes("uuid")) && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    Рекомендуется
                                  </Badge>
                                )}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addDedupKey}
                        disabled={!selectedDedupKey}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Selected dedup keys */}
                    {localLoadPolicy.dedupKeys && localLoadPolicy.dedupKeys.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          {localLoadPolicy.dedupKeys.map((key) => (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="text-sm cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              onClick={() => removeDedupKey(key)}
                            >
                              {key}
                              <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-start space-x-2 text-xs text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            Выбрано {localLoadPolicy.dedupKeys.length}{" "}
                            {localLoadPolicy.dedupKeys.length === 1 ? "поле" : "полей"}.
                            {localLoadPolicy.dedupKeys.length > 1 && " Будет использован составной ключ."}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              Ключи дедупликации не выбраны
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Для режима {loadMode} необходимо выбрать минимум 1 поле. Это может быть ID, уникальный
                              идентификатор или комбинация полей.
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                              💡 <strong>Совет:</strong> Если у вас есть поле с названием "id", "user_id", "order_id"
                              или "uuid" - это хороший кандидат для ключа дедупликации.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Conflict Strategy */}
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span>Политика конфликта</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2 text-xs">
                            <p>
                              <strong>Last-wins:</strong> При конфликте сохраняется запись с более поздним
                              временем/версией. Требует указать поле времени.
                            </p>
                            <p>
                              <strong>First-wins:</strong> При конфликте сохраняется первая запись, новые игнорируются.
                              Не требует поле времени.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select
                      value={localLoadPolicy.conflictStrategy}
                      onValueChange={(value: "last-wins" | "first-wins") =>
                        updateLoadPolicy({ conflictStrategy: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-wins">
                          <div className="flex flex-col items-start">
                            <span>Last-wins by timestamp</span>
                            <span className="text-xs text-muted-foreground">Новые данные перезаписывают старые</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="first-wins">
                          <div className="flex flex-col items-start">
                            <span>First-wins</span>
                            <span className="text-xs text-muted-foreground">Первая запись сохраняется</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timestamp Field (for last-wins) */}
                  {localLoadPolicy.conflictStrategy === "last-wins" && (
                    <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      {!localLoadPolicy.timestampField && !localLoadPolicy.versionField && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Для политики last-wins необходимо указать поле времени или версии. Без этого невозможно
                            определить, какая запись новее.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center space-x-2">
                            <span>Поле времени</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-blue-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  Поле с временной меткой (timestamp), по которому определяется, какая запись новее.
                                  Обычно это created_at, updated_at, event_time или любое поле с датой/временем.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Select
                            value={localLoadPolicy.timestampField || ""}
                            onValueChange={(value) => updateLoadPolicy({ timestampField: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите поле времени" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetFields.length === 0 ? (
                                <div className="p-2 text-xs text-muted-foreground">
                                  Нет доступных полей. Настройте маппинг на шаге 3.
                                </div>
                              ) : (
                                <>
                                  {targetFields
                                    .filter(
                                      (field) =>
                                        field.toLowerCase().includes("time") ||
                                        field.toLowerCase().includes("date") ||
                                        field.toLowerCase().includes("created") ||
                                        field.toLowerCase().includes("updated") ||
                                        field.toLowerCase().includes("timestamp"),
                                    )
                                    .map((field) => (
                                      <SelectItem key={field} value={field}>
                                        <div className="flex items-center space-x-2">
                                          <span>{field}</span>
                                          <Badge variant="secondary" className="text-xs">
                                            Рекомендуется
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  {targetFields
                                    .filter(
                                      (field) =>
                                        !field.toLowerCase().includes("time") &&
                                        !field.toLowerCase().includes("date") &&
                                        !field.toLowerCase().includes("created") &&
                                        !field.toLowerCase().includes("updated") &&
                                        !field.toLowerCase().includes("timestamp"),
                                    )
                                    .map((field) => (
                                      <SelectItem key={field} value={field}>
                                        {field}
                                      </SelectItem>
                                    ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            💡 Выберите поле с датой/временем. Если не видите нужное поле, проверьте маппинг на шаге 3.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Порядок</Label>
                          <Select
                            value={localLoadPolicy.timestampOrder || "desc"}
                            onValueChange={(value: "asc" | "desc") => updateLoadPolicy({ timestampOrder: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="desc">DESC (новые первыми)</SelectItem>
                              <SelectItem value="asc">ASC (старые первыми)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Watermark */}
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span>Watermark (опционально)</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Watermark позволяет обрабатывать поздно прибывающие данные. Укажите поле времени и задержку.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={localLoadPolicy.watermark?.field || ""}
                        onValueChange={(field) =>
                          updateLoadPolicy({
                            watermark: field ? { field, delay: localLoadPolicy.watermark?.delay || "PT1H" } : undefined,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Поле времени" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetFields.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground">Нет доступных полей</div>
                          ) : (
                            <>
                              {/* Show recommended fields first */}
                              {targetFields
                                .filter(
                                  (field) =>
                                    field.toLowerCase().includes("time") ||
                                    field.toLowerCase().includes("date") ||
                                    field.toLowerCase().includes("timestamp"),
                                )
                                .map((field) => (
                                  <SelectItem key={field} value={field}>
                                    <div className="flex items-center space-x-2">
                                      <span>{field}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        Рекомендуется
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              {targetFields
                                .filter(
                                  (field) =>
                                    !field.toLowerCase().includes("time") &&
                                    !field.toLowerCase().includes("date") &&
                                    !field.toLowerCase().includes("timestamp"),
                                )
                                .map((field) => (
                                  <SelectItem key={field} value={field}>
                                    {field}
                                  </SelectItem>
                                ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <Select
                        value={localLoadPolicy.watermark?.delay || "PT0S"}
                        onValueChange={(delay) =>
                          updateLoadPolicy({
                            watermark: localLoadPolicy.watermark?.field
                              ? { field: localLoadPolicy.watermark.field, delay }
                              : undefined,
                          })
                        }
                        disabled={!localLoadPolicy.watermark?.field}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Задержка" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PT0S">Без задержки</SelectItem>
                          <SelectItem value="PT15M">15 минут</SelectItem>
                          <SelectItem value="PT1H">1 час</SelectItem>
                          <SelectItem value="P1D">1 день</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Задержка для обработки поздно прибывающих данных
                    </div>
                  </div>

                  {/* PostgreSQL specific options */}
                  {targetPreset?.id === "postgresql" && loadMode === "upsert" && (
                    <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="create-index"
                          checked={localLoadPolicy.createUniqueIndex}
                          onCheckedChange={(checked) => updateLoadPolicy({ createUniqueIndex: !!checked })}
                        />
                        <Label htmlFor="create-index" className="text-sm cursor-pointer">
                          Создать уникальный индекс по dedup keys
                        </Label>
                      </div>
                      {!localLoadPolicy.createUniqueIndex && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Для эффективной работы UPSERT рекомендуется создать уникальный индекс
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* ClickHouse specific options */}
                  {targetPreset?.id === "clickhouse" && (
                    <div className="space-y-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="space-y-2">
                        <Label className="flex items-center space-x-2">
                          <span>ORDER BY</span>
                          <Badge variant="destructive" className="text-xs">
                            Обязательно
                          </Badge>
                        </Label>
                        <Select
                          value={localLoadPolicy.orderBy?.[0] || ""}
                          onValueChange={(value) => updateLoadPolicy({ orderBy: value ? [value] : [] })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите поле для сортировки" />
                          </SelectTrigger>
                          <SelectContent>
                            {targetFields.map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {loadMode === "merge" && localLoadPolicy.conflictStrategy === "last-wins" && (
                        <div className="space-y-2">
                          <Label>VERSION поле (для ReplacingMergeTree)</Label>
                          <Select
                            value={localLoadPolicy.versionField || ""}
                            onValueChange={(value) => updateLoadPolicy({ versionField: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите поле версии" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetFields.map((field) => (
                                <SelectItem key={field} value={field}>
                                  {field}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-muted-foreground">Обычно event_time или другое поле времени</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Schedule Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Расписание выполнения</span>
            </CardTitle>
            <CardDescription>Настройте частоту и время выполнения пайплайна</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recommendation */}
            {recommendation && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Для {targetPreset?.name}:</strong> {recommendation.reason}
                </AlertDescription>
              </Alert>
            )}

            {/* Frequency Selection */}
            <div className="space-y-2">
              <Label>Частота выполнения</Label>
              <div className="grid grid-cols-3 gap-2">
                {schedulePresets.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={localSchedule.frequency === preset.value ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => updateSchedule({ frequency: preset.value as any, cron: preset.cron })}
                  >
                    {renderPresetIcon(preset.iconType)}
                    <span className="ml-2">{preset.label.split(" ")[0]}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Cron Expression */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cron выражение</Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  <HelpCircle className="w-3 h-3 mr-1" />
                  Помощь
                </Button>
              </div>
              <Input
                value={localSchedule.cron}
                onChange={(e) => updateSchedule({ cron: e.target.value })}
                placeholder="0 2 * * *"
                className="font-mono"
              />
              <div className="text-xs text-muted-foreground">
                Формат: минута час день месяц день_недели • Все расписания исполняются в UTC
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Количество повторов</Label>
                <Select
                  value={localSchedule.retries?.count.toString() || "2"}
                  onValueChange={(value) =>
                    updateSchedule({
                      retries: { count: Number.parseInt(value), delaySec: localSchedule.retries?.delaySec || 300 },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} {count === 0 ? "(без повторов)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Задержка между повторами (сек)</Label>
                <Input
                  type="number"
                  min={60}
                  max={3600}
                  value={localSchedule.retries?.delaySec || 300}
                  onChange={(e) =>
                    updateSchedule({
                      retries: { count: localSchedule.retries?.count || 2, delaySec: Number.parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>SLA (опционально)</Label>
              <Input
                maxLength={80}
                value={localSchedule.slaNote || ""}
                onChange={(e) => updateSchedule({ slaNote: e.target.value })}
                placeholder="Например: Доступно к 03:00 UTC"
              />
              <div className="text-xs text-muted-foreground">До 80 символов</div>
            </div>

            {timeField && (
              <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="catchup"
                    checked={localSchedule.catchup?.enabled || false}
                    onCheckedChange={(checked) =>
                      updateSchedule({
                        catchup: { enabled: !!checked, window: localSchedule.catchup?.window || "P7D" },
                      })
                    }
                  />
                  <Label htmlFor="catchup" className="text-sm cursor-pointer">
                    Догонять пропуски (Catchup/Backfill)
                  </Label>
                </div>
                {localSchedule.catchup?.enabled && (
                  <div className="space-y-2 ml-6">
                    <Label className="text-xs">Окно догонки</Label>
                    <Select
                      value={localSchedule.catchup?.window || "P7D"}
                      onValueChange={(value: "P1D" | "P7D" | "P30D") =>
                        updateSchedule({
                          catchup: { enabled: true, window: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P1D">1 день</SelectItem>
                        <SelectItem value="P7D">7 дней</SelectItem>
                        <SelectItem value="P30D">30 дней</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg space-y-2">
              <div className="text-sm font-medium">Предварительный просмотр:</div>
              <div className="text-sm text-muted-foreground">
                Выполнение: {localSchedule.frequency === "hourly" && "каждый час"}
                {localSchedule.frequency === "daily" && "ежедневно в 02:00"}
                {localSchedule.frequency === "weekly" && "еженедельно (Пн в 03:00)"} (UTC
                {Intl.DateTimeFormat().resolvedOptions().timeZone !== "UTC" &&
                  ` / ${new Date().toLocaleTimeString("ru-RU", { timeZoneName: "short" }).split(" ").pop()}`}
                )
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">Ближайшие 3 запуска:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {nextExecutions.map((exec, i) => (
                    <li key={i}>{exec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">Сводка конфигурации</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Режим загрузки</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {loadMode}
                    </Badge>
                  </div>
                </div>
                {showAdvancedConfig && localLoadPolicy.dedupKeys && localLoadPolicy.dedupKeys.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Ключи дедупликации</Label>
                    <div className="text-sm mt-1">{localLoadPolicy.dedupKeys.join(", ")}</div>
                  </div>
                )}
                {localLoadPolicy.conflictStrategy && showAdvancedConfig && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Политика конфликта</Label>
                    <div className="text-sm mt-1">{localLoadPolicy.conflictStrategy}</div>
                  </div>
                )}
                {localLoadPolicy.watermark && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Watermark</Label>
                    <div className="text-sm mt-1">
                      {localLoadPolicy.watermark.field} (задержка: {localLoadPolicy.watermark.delay})
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Расписание</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{localSchedule.frequency}</Badge>
                    <span className="text-sm font-mono">{localSchedule.cron}</span>
                  </div>
                </div>
                {localSchedule.retries && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Повторы</Label>
                    <div className="text-sm mt-1">
                      {localSchedule.retries.count} раз с задержкой {localSchedule.retries.delaySec} сек
                    </div>
                  </div>
                )}
                {targetPreset?.id === "clickhouse" && localLoadPolicy.orderBy && localLoadPolicy.orderBy.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">ORDER BY</Label>
                    <div className="text-sm mt-1">{localLoadPolicy.orderBy.join(", ")}</div>
                  </div>
                )}
                {localSchedule.catchup?.enabled && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Catchup</Label>
                    <div className="text-sm mt-1">Включен (окно: {localSchedule.catchup.window})</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
