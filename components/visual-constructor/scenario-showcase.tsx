"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clock, Database, Zap } from "lucide-react"
import { getAllDummyScenarios } from "@/lib/dummy-data"
import { systemPresets } from "./system-presets"

interface ScenarioShowcaseProps {
  onSelectScenario: (scenarioId: string) => void
}

export function ScenarioShowcase({ onSelectScenario }: ScenarioShowcaseProps) {
  const scenarios = getAllDummyScenarios()

  const getSystemIcon = (systemId: string) => {
    const preset = systemPresets.find((p) => p.id === systemId)
    return preset?.icon || <Database className="w-4 h-4" />
  }

  const getSystemName = (systemId: string) => {
    const preset = systemPresets.find((p) => p.id === systemId)
    return preset?.name || systemId
  }

  const getScheduleBadgeColor = (schedule: string) => {
    switch (schedule) {
      case "streaming":
        return "bg-green-100 text-green-800 border-green-200"
      case "hourly":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "daily":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "weekly":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Готовые сценарии</h3>
        <p className="text-sm text-muted-foreground">Выберите готовый сценарий для быстрого старта</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>{scenario.name}</span>
                </CardTitle>
                <Badge variant="outline" className={getScheduleBadgeColor(scenario.schedule)}>
                  <Clock className="w-3 h-3 mr-1" />
                  {scenario.schedule}
                </Badge>
              </div>
              <CardDescription className="text-sm">{scenario.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Data Flow */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getSystemIcon(scenario.source)}
                  <span className="text-sm font-medium">{getSystemName(scenario.source)}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center space-x-2">
                  {getSystemIcon(scenario.target)}
                  <span className="text-sm font-medium">{getSystemName(scenario.target)}</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => onSelectScenario(scenario.id)}
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                variant="outline"
              >
                Использовать сценарий
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
