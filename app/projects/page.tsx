"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Database,
  Workflow,
  FileText,
  Trash2,
  Edit,
  Copy,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface Project {
  id: string
  name: string
  description: string
  status: "active" | "paused" | "completed" | "error"
  storage: string
  schedule: string
  lastRun?: Date
  nextRun?: Date
  createdAt: Date
  updatedAt: Date
}

// Mock data for demonstration
const mockProjects: Project[] = [
  {
    id: "1",
    name: "E-commerce Analytics",
    description: "Анализ данных продаж и поведения пользователей",
    status: "active",
    storage: "PostgreSQL",
    schedule: "daily",
    lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    name: "IoT Sensor Data",
    description: "Обработка данных с IoT устройств в реальном времени",
    status: "active",
    storage: "ClickHouse",
    schedule: "streaming",
    lastRun: new Date(Date.now() - 5 * 60 * 1000),
    nextRun: new Date(Date.now() + 5 * 60 * 1000),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "3",
    name: "Financial Reports",
    description: "Еженедельные финансовые отчеты",
    status: "paused",
    storage: "PostgreSQL",
    schedule: "weekly",
    lastRun: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "4",
    name: "Log Processing",
    description: "Обработка логов приложений",
    status: "error",
    storage: "HDFS",
    schedule: "hourly",
    lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [storageFilter, setStorageFilter] = useState<string>("all")

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch("/api/projects")
        const { projects: dbProjects } = await response.json()

        // Transform database projects to match UI interface
        const transformedProjects = dbProjects.map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description || "",
          status: project.status,
          storage: project.target_preset?.name || "Unknown",
          schedule: project.schedule?.frequency || "Unknown",
          lastRun: project.updated_at ? new Date(project.updated_at) : undefined,
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at),
        }))

        setProjects(transformedProjects)
      } catch (error) {
        console.error("Failed to load projects:", error)
        // Fallback to mock data if database fails
        setProjects(mockProjects)
      } finally {
        setIsLoading(false)
      }
    }

    loadProjects()
  }, [])

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    const matchesStorage = storageFilter === "all" || project.storage === storageFilter

    return matchesSearch && matchesStatus && matchesStorage
  })

  const getStatusBadge = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Активен
          </Badge>
        )
      case "paused":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Pause className="w-3 h-3 mr-1" />
            Приостановлен
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Завершен
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Ошибка
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStorageIcon = (storage: string) => {
    switch (storage) {
      case "PostgreSQL":
        return <Database className="w-4 h-4 text-blue-600" />
      case "ClickHouse":
        return <Database className="w-4 h-4 text-orange-600" />
      case "HDFS":
        return <Database className="w-4 h-4 text-green-600" />
      default:
        return <Database className="w-4 h-4" />
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const absDiff = Math.abs(diff)

    if (absDiff < 60 * 1000) {
      return "сейчас"
    } else if (absDiff < 60 * 60 * 1000) {
      const minutes = Math.floor(absDiff / (60 * 1000))
      return diff > 0 ? `через ${minutes} мин` : `${minutes} мин назад`
    } else if (absDiff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(absDiff / (60 * 60 * 1000))
      return diff > 0 ? `через ${hours} ч` : `${hours} ч назад`
    } else {
      const days = Math.floor(absDiff / (24 * 60 * 60 * 1000))
      return diff > 0 ? `через ${days} дн` : `${days} дн назад`
    }
  }

  const projectStats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    paused: projects.filter((p) => p.status === "paused").length,
    error: projects.filter((p) => p.status === "error").length,
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Проекты</h1>
          <p className="text-muted-foreground">Управление пайплайнами обработки данных</p>
        </div>
        <Link href="/">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Новый проект
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Workflow className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Всего проектов</p>
                <p className="text-2xl font-bold">{projectStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Активных</p>
                <p className="text-2xl font-bold text-green-600">{projectStats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Pause className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Приостановлено</p>
                <p className="text-2xl font-bold text-yellow-600">{projectStats.paused}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">С ошибками</p>
                <p className="text-2xl font-bold text-red-600">{projectStats.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск проектов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="paused">Приостановленные</option>
                <option value="completed">Завершенные</option>
                <option value="error">С ошибками</option>
              </select>

              <select
                value={storageFilter}
                onChange={(e) => setStorageFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Все хранилища</option>
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="ClickHouse">ClickHouse</option>
                <option value="HDFS">HDFS</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Загрузка проектов...</p>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Проекты не найдены</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all" || storageFilter !== "all"
                  ? "Попробуйте изменить фильтры поиска"
                  : "Создайте свой первый проект для начала работы"}
              </p>
              {!searchQuery && statusFilter === "all" && storageFilter === "all" && (
                <Link href="/">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать проект
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Project Header */}
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      {getStatusBadge(project.status)}
                    </div>

                    <p className="text-muted-foreground">{project.description}</p>

                    {/* Project Details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center space-x-1">
                        {getStorageIcon(project.storage)}
                        <span>{project.storage}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{project.schedule}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Создан {formatDate(project.createdAt)}</span>
                      </div>
                    </div>

                    {/* Run Information */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {project.lastRun && <span>Последний запуск: {getRelativeTime(project.lastRun)}</span>}
                      {project.nextRun && project.status === "active" && (
                        <span>Следующий запуск: {getRelativeTime(project.nextRun)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Дублировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {project.status === "active" ? (
                        <DropdownMenuItem>
                          <Pause className="w-4 h-4 mr-2" />
                          Приостановить
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>
                          <Play className="w-4 h-4 mr-2" />
                          Запустить
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
