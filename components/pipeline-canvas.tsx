"use client"

import React, { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Database,
  Filter,
  Layers,
  GitMerge,
  Trash2,
  Settings,
  ArrowRight,
  Calendar,
  Hash,
  Type,
  Shuffle,
} from "lucide-react"
import type { PipelineNode, PipelineEdge } from "@/lib/types"

interface PipelineCanvasProps {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  onNodesChange: (nodes: PipelineNode[]) => void
  onEdgesChange: (edges: PipelineEdge[]) => void
}

const TRANSFORM_OPERATORS = [
  { value: "Filter", label: "Filter", icon: Filter, description: "Фильтрация строк по условию" },
  { value: "Project", label: "Project", icon: Layers, description: "Выбор колонок" },
  { value: "Aggregate", label: "Aggregate", icon: Hash, description: "Агрегация данных" },
  { value: "Join", label: "Join", icon: GitMerge, description: "Соединение таблиц" },
  { value: "Deduplicate", label: "Deduplicate", icon: Shuffle, description: "Удаление дубликатов" },
  { value: "TypeCast", label: "Type Cast", icon: Type, description: "Преобразование типов" },
  { value: "DateTrunc", label: "Date Trunc", icon: Calendar, description: "Округление дат" },
  { value: "Upsert", label: "Upsert", icon: Database, description: "Обновление или вставка" },
]

export function PipelineCanvas({ nodes, edges, onNodesChange, onEdgesChange }: PipelineCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggedOperator, setDraggedOperator] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const addNode = useCallback(
    (type: "Source" | "Transform" | "Target", operator?: string, x = 100, y = 100) => {
      const newNode: PipelineNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        operator: operator as any,
        config: {},
      }

      const newNodes = [...nodes, newNode]
      onNodesChange(newNodes)

      // Auto-connect nodes in sequence
      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1]
        const newEdge: PipelineEdge = {
          from: lastNode.id,
          to: newNode.id,
        }
        onEdgesChange([...edges, newEdge])
      }
    },
    [nodes, edges, onNodesChange, onEdgesChange],
  )

  const removeNode = useCallback(
    (nodeId: string) => {
      const newNodes = nodes.filter((n) => n.id !== nodeId)
      const newEdges = edges.filter((e) => e.from !== nodeId && e.to !== nodeId)
      onNodesChange(newNodes)
      onEdgesChange(newEdges)
      if (selectedNode === nodeId) {
        setSelectedNode(null)
      }
    },
    [nodes, edges, onNodesChange, onEdgesChange, selectedNode],
  )

  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, any>) => {
      const newNodes = nodes.map((node) =>
        node.id === nodeId ? { ...node, config: { ...node.config, ...config } } : node,
      )
      onNodesChange(newNodes)
    },
    [nodes, onNodesChange],
  )

  const handleDragStart = useCallback((operator: string) => {
    setDraggedOperator(operator)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (draggedOperator && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        addNode("Transform", draggedOperator, x, y)
        setDraggedOperator(null)
      }
    },
    [draggedOperator, addNode],
  )

  const getNodeIcon = (node: PipelineNode) => {
    if (node.type === "Source") return Database
    if (node.type === "Target") return Database
    const operator = TRANSFORM_OPERATORS.find((op) => op.value === node.operator)
    return operator?.icon || Settings
  }

  const getNodeColor = (node: PipelineNode) => {
    if (node.type === "Source") return "bg-blue-100 border-blue-300 text-blue-800"
    if (node.type === "Target") return "bg-green-100 border-green-300 text-green-800"
    return "bg-orange-100 border-orange-300 text-orange-800"
  }

  const selectedNodeData = selectedNode ? nodes.find((n) => n.id === selectedNode) : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
      {/* Operators Palette */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Операторы</CardTitle>
            <CardDescription>Перетащите на канву для добавления</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => addNode("Source")}
              >
                <Database className="w-4 h-4 mr-2" />
                Источник
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => addNode("Target")}
              >
                <Database className="w-4 h-4 mr-2" />
                Цель
              </Button>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label className="text-sm font-medium">Трансформации</Label>
              {TRANSFORM_OPERATORS.map((operator) => {
                const Icon = operator.icon
                return (
                  <div
                    key={operator.value}
                    draggable
                    onDragStart={() => handleDragStart(operator.value)}
                    className="flex items-center space-x-2 p-2 rounded border cursor-move hover:bg-muted transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{operator.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{operator.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Canvas */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Канва пайплайна</CardTitle>
            <CardDescription>Source → Transform → Target</CardDescription>
          </CardHeader>
          <CardContent className="h-full p-4">
            <div
              ref={canvasRef}
              className="relative w-full h-full bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 overflow-auto"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {nodes.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Database className="w-12 h-12 mx-auto mb-2" />
                    <p>Добавьте узлы для создания пайплайна</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4 p-4 min-w-max">
                  {nodes.map((node, index) => {
                    const Icon = getNodeIcon(node)
                    const isSelected = selectedNode === node.id

                    return (
                      <React.Fragment key={node.id}>
                        <div
                          className={`relative flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all min-w-[120px] ${getNodeColor(
                            node,
                          )} ${isSelected ? "ring-2 ring-primary" : ""}`}
                          onClick={() => setSelectedNode(node.id)}
                        >
                          <Icon className="w-6 h-6 mb-2" />
                          <span className="text-sm font-medium text-center">
                            {node.type === "Source"
                              ? "Источник"
                              : node.type === "Target"
                                ? "Цель"
                                : TRANSFORM_OPERATORS.find((op) => op.value === node.operator)?.label || node.operator}
                          </span>
                          {node.operator && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {node.operator}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/80"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeNode(node.id)
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        {index < nodes.length - 1 && <ArrowRight className="w-5 h-5 text-muted-foreground" />}
                      </React.Fragment>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Panel */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Свойства</CardTitle>
            <CardDescription>{selectedNodeData ? `Настройки узла` : "Выберите узел для настройки"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedNodeData ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Тип узла</Label>
                  <Badge variant="outline" className="ml-2">
                    {selectedNodeData.type}
                  </Badge>
                </div>

                {selectedNodeData.operator && (
                  <div>
                    <Label className="text-sm font-medium">Оператор</Label>
                    <Badge variant="secondary" className="ml-2">
                      {selectedNodeData.operator}
                    </Badge>
                  </div>
                )}

                <Separator />

                {/* Node-specific configuration */}
                {selectedNodeData.type === "Source" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="source-table">Таблица источника</Label>
                      <Input
                        id="source-table"
                        value={selectedNodeData.config.table || ""}
                        onChange={(e) => updateNodeConfig(selectedNodeData.id, { table: e.target.value })}
                        placeholder="users, orders, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="source-schema">Схема</Label>
                      <Input
                        id="source-schema"
                        value={selectedNodeData.config.schema || ""}
                        onChange={(e) => updateNodeConfig(selectedNodeData.id, { schema: e.target.value })}
                        placeholder="public, analytics, etc."
                      />
                    </div>
                  </div>
                )}

                {selectedNodeData.type === "Target" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="target-table">Целевая таблица</Label>
                      <Input
                        id="target-table"
                        value={selectedNodeData.config.table || ""}
                        onChange={(e) => updateNodeConfig(selectedNodeData.id, { table: e.target.value })}
                        placeholder="processed_users, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="write-mode">Режим записи</Label>
                      <Select
                        value={selectedNodeData.config.writeMode || "append"}
                        onValueChange={(value) => updateNodeConfig(selectedNodeData.id, { writeMode: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="append">Append</SelectItem>
                          <SelectItem value="overwrite">Overwrite</SelectItem>
                          <SelectItem value="upsert">Upsert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedNodeData.operator === "Filter" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="filter-condition">Условие фильтрации</Label>
                      <Input
                        id="filter-condition"
                        value={selectedNodeData.config.condition || ""}
                        onChange={(e) => updateNodeConfig(selectedNodeData.id, { condition: e.target.value })}
                        placeholder="age > 18, status = 'active'"
                      />
                    </div>
                  </div>
                )}

                {selectedNodeData.operator === "Project" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="project-columns">Выбранные колонки</Label>
                      <Input
                        id="project-columns"
                        value={selectedNodeData.config.columns || ""}
                        onChange={(e) => updateNodeConfig(selectedNodeData.id, { columns: e.target.value })}
                        placeholder="id, name, email, created_at"
                      />
                    </div>
                  </div>
                )}

                {selectedNodeData.operator === "Aggregate" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="group-by">Группировка по</Label>
                      <Input
                        id="group-by"
                        value={selectedNodeData.config.groupBy || ""}
                        onChange={(e) => updateNodeConfig(selectedNodeData.id, { groupBy: e.target.value })}
                        placeholder="category, date_trunc('day', created_at)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aggregations">Агрегации</Label>
                      <Input
                        id="aggregations"
                        value={selectedNodeData.config.aggregations || ""}
                        onChange={(e) => updateNodeConfig(selectedNodeData.id, { aggregations: e.target.value })}
                        placeholder="count(*), sum(amount), avg(price)"
                      />
                    </div>
                  </div>
                )}

                {selectedNodeData.operator === "Deduplicate" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="dedup-keys">Ключи дедупликации</Label>
                      <Input
                        id="dedup-keys"
                        value={selectedNodeData.config.keys || ""}
                        onChange={(e) => updateNodeConfig(selectedNodeData.id, { keys: e.target.value })}
                        placeholder="user_id, email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dedup-strategy">Стратегия</Label>
                      <Select
                        value={selectedNodeData.config.strategy || "first"}
                        onValueChange={(value) => updateNodeConfig(selectedNodeData.id, { strategy: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first">Первая запись</SelectItem>
                          <SelectItem value="last">Последняя запись</SelectItem>
                          <SelectItem value="max">Максимальное значение</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Settings className="w-12 h-12 mx-auto mb-2" />
                <p>Выберите узел на канве для настройки его свойств</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
