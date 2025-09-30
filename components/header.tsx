"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Database, Home, FolderOpen, HelpCircle } from "lucide-react"

export function Header() {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">AI Data Engineer</span>
          </Link>
        </div>

        <nav className="flex items-center space-x-6">
          <Link
            href="/"
            className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
          >
            <Home className="h-4 w-4" />
            <span>Главная</span>
          </Link>
          <Link
            href="/projects"
            className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Проекты</span>
          </Link>
        </nav>

        <div className="flex items-center space-x-2">
          <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-transparent">
                <HelpCircle className="h-4 w-4" />
                <span>Помощь</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span>AI Data Engineer - Помощь</span>
                </DialogTitle>
                <DialogDescription>
                  Руководство по использованию платформы для автоматической генерации пайплайнов обработки данных
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 max-h-96 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Что такое AI Data Engineer?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI Data Engineer - это интеллектуальная платформа для автоматической генерации пайплайнов обработки
                    данных. Система анализирует ваши данные и создает готовые к использованию ETL/ELT решения с
                    минимальными усилиями с вашей стороны.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">Основные возможности:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Автоматический анализ структуры и качества данных</li>
                    <li>Интеллектуальные рекомендации по выбору хранилища данных</li>
                    <li>Визуальный конструктор пайплайнов с drag-and-drop интерфейсом</li>
                    <li>Автоматическая генерация DDL скриптов и ETL кода</li>
                    <li>Поддержка популярных систем: PostgreSQL, ClickHouse, HDFS, Kafka</li>
                    <li>Готовые Airflow DAG файлы для оркестрации</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">Пошаговая инструкция:</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Создание проекта</p>
                        <p className="text-muted-foreground">
                          Укажите название и описание проекта. Выберите источник данных: файлы (CSV, JSON, XML, Excel)
                          или системы (PostgreSQL, ClickHouse, Kafka).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Загрузка и анализ данных</p>
                        <p className="text-muted-foreground">
                          Загрузите файлы или настройте подключение к системе. ИИ автоматически проанализирует
                          структуру, типы данных и качество.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Получение рекомендаций</p>
                        <p className="text-muted-foreground">
                          Система предложит оптимальные решения для хранения данных на основе анализа: PostgreSQL для
                          транзакций, ClickHouse для аналитики, HDFS для больших объемов.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Настройка маппинга полей</p>
                        <p className="text-muted-foreground">
                          Используйте drag-and-drop для сопоставления полей источника и цели. Настройте трансформации:
                          приведение типов, очистка данных, агрегации.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        5
                      </div>
                      <div>
                        <p className="font-medium">Создание пайплайна</p>
                        <p className="text-muted-foreground">
                          Визуально постройте пайплайн: источник → трансформации → целевая система. Настройте расписание
                          выполнения и режим загрузки данных.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        6
                      </div>
                      <div>
                        <p className="font-medium">Экспорт и развертывание</p>
                        <p className="text-muted-foreground">
                          Скачайте готовый проект с DDL скриптами, Airflow DAG, конфигурационными файлами и подробной
                          документацией.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">Поддерживаемые форматы данных:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="font-medium">Файлы:</p>
                      <ul className="text-muted-foreground list-disc list-inside">
                        <li>CSV (разделители: запятая, точка с запятой)</li>
                        <li>JSON (структурированный и JSONL)</li>
                        <li>XML (с автоматическим парсингом схемы)</li>
                        <li>Excel (XLS, XLSX)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Системы:</p>
                      <ul className="text-muted-foreground list-disc list-inside">
                        <li>PostgreSQL</li>
                        <li>ClickHouse</li>
                        <li>Apache Kafka</li>
                        <li>HDFS</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">Советы по использованию:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Для больших файлов (&gt;10MB) используется умное сэмплирование для ускорения анализа</li>
                    <li>JSON файлы анализируются полностью для максимальной точности</li>
                    <li>Используйте готовые сценарии для быстрого старта с типовыми задачами</li>
                    <li>AI помощник поможет настроить сложные трансформации и оптимизировать производительность</li>
                    <li>Сохраняйте проекты для повторного использования и модификации</li>
                  </ul>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Нужна дополнительная помощь?</h4>
                  <p className="text-sm text-muted-foreground">
                    Если у вас возникли вопросы или проблемы, обратитесь к документации проекта или свяжитесь с
                    технической поддержкой.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
