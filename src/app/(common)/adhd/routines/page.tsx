"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LuPlus as Plus, LuSparkles as Sparkles } from "react-icons/lu";
import { toast } from "sonner";
import {
  RoutineBuilder,
  RoutineDashboard,
  RoutineTimeline,
} from "@/components/adhd/routines";
import { TemplateGallery } from "@/components/adhd/routines/TemplateGallery";
import {
  useRoutineStore,
  NewRoutine,
  RoutineWithTasks,
} from "@/store/adhd/routineStore";
import { RoutineTemplate } from "@/lib/adhd/routineTemplates";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RoutinesPage() {
  const router = useRouter();
  const { routines, createRoutine, updateRoutine, deleteRoutine } =
    useRoutineStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<RoutineTemplate | null>(null);
  const [editingRoutine, setEditingRoutine] =
    React.useState<RoutineWithTasks | null>(null);
  const [deletingRoutine, setDeletingRoutine] =
    React.useState<RoutineWithTasks | null>(null);

  const handleCreateRoutine = async (routine: NewRoutine) => {
    try {
      await createRoutine(routine);
      toast.success("Rutina creada exitosamente");
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error("Error al crear rutina");
      console.error("Failed to create routine:", error);
      throw error;
    }
  };

  const handleUpdateRoutine = async (routine: NewRoutine) => {
    if (!editingRoutine) return;

    try {
      await updateRoutine(editingRoutine.id, routine);
      toast.success("Rutina actualizada exitosamente");
      setEditingRoutine(null);
    } catch (error) {
      toast.error("Error al actualizar rutina");
      console.error("Failed to update routine:", error);
      throw error;
    }
  };

  const handleDeleteRoutine = async () => {
    if (!deletingRoutine) return;

    try {
      await deleteRoutine(deletingRoutine.id);
      toast.success("Rutina eliminada exitosamente");
      setDeletingRoutine(null);
    } catch (error) {
      toast.error("Error al eliminar rutina");
      console.error("Failed to delete routine:", error);
    }
  };

  const handleSelectTemplate = (template: RoutineTemplate) => {
    setSelectedTemplate(template);
    setIsCreateDialogOpen(true);
  };

  const handleCreateFromTemplate = async (routine: NewRoutine) => {
    try {
      await createRoutine(routine);
      toast.success("Rutina creada desde plantilla exitosamente");
      setIsCreateDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      toast.error("Error al crear rutina");
      console.error("Failed to create routine from template:", error);
      throw error;
    }
  };

  const handleStartRoutine = (routine: RoutineWithTasks) => {
    router.push(`/adhd/routines/${routine.id}/execute`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rutinas</h1>
            <p className="text-sm text-muted-foreground">
              Organiza tus hábitos en rutinas estructuradas y crea flujos
              automáticos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedTemplate(null)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Plantillas
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Rutina
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="timeline" className="h-full">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="mis-rutinas">Mis Rutinas</TabsTrigger>
            <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <RoutineTimeline
              routines={routines}
              onStartRoutine={handleStartRoutine}
            />
          </TabsContent>

          <TabsContent value="mis-rutinas" className="mt-4">
            <RoutineDashboard
              onEdit={setEditingRoutine}
              onDelete={setDeletingRoutine}
              onCreateRoutine={() => setIsCreateDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="plantillas" className="mt-4">
            <TemplateGallery onSelectTemplate={handleSelectTemplate} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Routine Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) setSelectedTemplate(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Crear Rutina desde Plantilla" : "Crear Nueva Rutina"}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? `Personaliza la rutina "${selectedTemplate.templateName}" antes de crearla.`
                : "Define una rutina con múltiples tareas ordenadas. Cada tarea puede continuar automáticamente a la siguiente."}
            </DialogDescription>
          </DialogHeader>

          <RoutineBuilder
            initialData={selectedTemplate || undefined}
            onSave={selectedTemplate ? handleCreateFromTemplate : handleCreateRoutine}
            onCancel={() => {
              setIsCreateDialogOpen(false);
              setSelectedTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Routine Dialog */}
      <Dialog
        open={editingRoutine !== null}
        onOpenChange={(open) => !open && setEditingRoutine(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Editar Rutina</DialogTitle>
            <DialogDescription>
              Modifica la rutina y sus tareas. Los cambios se guardarán
              inmediatamente.
            </DialogDescription>
          </DialogHeader>

          {editingRoutine && (
            <RoutineBuilder
              initialData={{
                name: editingRoutine.name,
                description: editingRoutine.description || undefined,
                icon: editingRoutine.icon || undefined,
                category: editingRoutine.category || undefined,
                startTime: editingRoutine.startTime,
                isActive: editingRoutine.isActive,
                order: editingRoutine.order,
                tasks: editingRoutine.tasks.map((task) => ({
                  name: task.name,
                  icon: task.icon || undefined,
                  duration: task.duration,
                  order: task.order,
                  autoContinue: task.autoContinue,
                  notes: task.notes || undefined,
                })),
              }}
              onSave={handleUpdateRoutine}
              onCancel={() => setEditingRoutine(null)}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingRoutine !== null}
        onOpenChange={(open) => !open && setDeletingRoutine(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rutina?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              rutina &quot;{deletingRoutine?.name}&quot; y todas sus tareas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoutine}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
