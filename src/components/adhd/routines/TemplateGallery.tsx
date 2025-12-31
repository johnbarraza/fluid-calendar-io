"use client";

import * as React from "react";
import { LuClock as Clock, LuPlus as Plus } from "react-icons/lu";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplateCategoryCounts,
  RoutineTemplate,
} from "@/lib/adhd/routineTemplates";

interface TemplateGalleryProps {
  onSelectTemplate: (template: RoutineTemplate) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  mañana: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  noche: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  ejercicio: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  estudio: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  relajación: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<RoutineTemplate | null>(null);

  const templates =
    selectedCategory === "all"
      ? getAllTemplates()
      : getTemplatesByCategory(selectedCategory);

  const categoryCounts = getTemplateCategoryCounts();

  const handleTemplateClick = (template: RoutineTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      setSelectedTemplate(null);
    }
  };

  const totalDuration = (template: RoutineTemplate) =>
    template.tasks.reduce((sum, task) => sum + task.duration, 0);

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center gap-3">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todas ({getAllTemplates().length})
            </SelectItem>
            <SelectItem value="mañana">
              Mañana ({categoryCounts["mañana"] || 0})
            </SelectItem>
            <SelectItem value="noche">
              Noche ({categoryCounts["noche"] || 0})
            </SelectItem>
            <SelectItem value="ejercicio">
              Ejercicio ({categoryCounts["ejercicio"] || 0})
            </SelectItem>
            <SelectItem value="estudio">
              Estudio ({categoryCounts["estudio"] || 0})
            </SelectItem>
            <SelectItem value="relajación">
              Relajación ({categoryCounts["relajación"] || 0})
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer overflow-hidden transition-all hover:shadow-md"
            onClick={() => handleTemplateClick(template)}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                  {template.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{template.templateName}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {template.templateDescription}
                  </p>

                  {/* Category & Stats */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {template.category && (
                      <Badge
                        variant="secondary"
                        className={CATEGORY_COLORS[template.category] || ""}
                      >
                        {template.category}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{totalDuration(template)} min</span>
                      <span className="mx-1">•</span>
                      <span>{template.tasks.length} tareas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Template Preview Dialog */}
      <Dialog
        open={selectedTemplate !== null}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{selectedTemplate.icon}</div>
                  <div>
                    <DialogTitle>{selectedTemplate.templateName}</DialogTitle>
                    <DialogDescription>
                      {selectedTemplate.templateDescription}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Template Info */}
                <div className="rounded-md bg-muted p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Categoría:</span>
                      <Badge
                        variant="secondary"
                        className={`ml-2 ${
                          CATEGORY_COLORS[selectedTemplate.category || ""] || ""
                        }`}
                      >
                        {selectedTemplate.category}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hora sugerida:</span>
                      <span className="ml-2 font-medium">
                        {selectedTemplate.startTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duración total:</span>
                      <span className="ml-2 font-medium">
                        {totalDuration(selectedTemplate)} minutos
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tareas:</span>
                      <span className="ml-2 font-medium">
                        {selectedTemplate.tasks.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Tareas incluidas:</h4>
                  <div className="space-y-2">
                    {selectedTemplate.tasks.map((task, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-md border bg-card p-3"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                          {index + 1}
                        </div>
                        <div className="text-lg flex-shrink-0">{task.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{task.name}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {task.duration}m
                            </span>
                          </div>
                          {task.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleUseTemplate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Usar esta Rutina
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
