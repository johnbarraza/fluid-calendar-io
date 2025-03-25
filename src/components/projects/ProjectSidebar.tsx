"use client";

import { useProjectStore } from "@/store/project";
import { useTaskStore } from "@/store/task";
import { useEffect, useState, useCallback } from "react";
import { HiPlus, HiPencil, HiFolderOpen } from "react-icons/hi";
import { BsArrowRepeat } from "react-icons/bs";
import { ProjectStatus, Project } from "@/types/project";
import { ProjectModal } from "./ProjectModal";
import { useDroppableProject } from "../dnd/useDragAndDrop";
import { TaskStatus } from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { isSaasEnabled } from "@/lib/config";

// Special project object to represent "no project" state
const NO_PROJECT: Partial<Project> = {
  id: "no-project",
  name: "No Project",
};

// Interface for task list mappings
interface TaskListMapping {
  id: string;
  providerId: string;
  projectId: string;
  externalListId: string;
  externalListName: string;
}

export function ProjectSidebar() {
  const {
    projects,
    loading,
    error,
    fetchProjects,
    setActiveProject,
    activeProject,
  } = useProjectStore();
  const { tasks } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [projectMappings, setProjectMappings] = useState<
    Record<string, TaskListMapping[]>
  >({});
  const [syncingProjects, setSyncingProjects] = useState<Set<string>>(
    new Set()
  );

  const { droppableProps: removeProjectProps, isOver: isOverRemove } =
    useDroppableProject(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch task list mappings for projects
  useEffect(() => {
    if (projects.length > 0) {
      fetchProjectMappings();
    }
  }, [projects]);

  const fetchProjectMappings = async () => {
    try {
      const response = await fetch("/api/task-sync/mappings");
      const data = await response.json();

      if (data.mappings) {
        // Group mappings by project ID
        const mappingsByProject: Record<string, TaskListMapping[]> = {};

        data.mappings.forEach((mapping: TaskListMapping) => {
          if (!mappingsByProject[mapping.projectId]) {
            mappingsByProject[mapping.projectId] = [];
          }
          mappingsByProject[mapping.projectId].push(mapping);
        });

        setProjectMappings(mappingsByProject);
      }
    } catch (error) {
      console.error("Failed to fetch task list mappings:", error);
    }
  };

  const handleSyncProject = useCallback(
    async (projectId: string, mappingId: string) => {
      if (syncingProjects.has(projectId)) return;

      try {
        setSyncingProjects((prev) => new Set(prev).add(projectId));

        const response = await fetch("/api/task-sync/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mappingId,
            direction: "bidirectional",
          }),
        });

        if (response.ok) {
          if (isSaasEnabled) {
            toast.success("Task sync initiated for project");
          } else {
            const { fetchTasks } = useTaskStore.getState();
            await fetchTasks();
            toast.success("Sync Completed");
          }
        } else {
          toast.error("Failed to sync tasks for project");
        }
      } catch (error) {
        console.error("Failed to sync project tasks:", error);
        toast.error("Failed to sync tasks for project");
      } finally {
        setSyncingProjects((prev) => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
      }
    },
    [syncingProjects]
  );

  const activeProjects = projects.filter(
    (project) => project.status === ProjectStatus.ACTIVE
  );
  const archivedProjects = projects.filter(
    (project) => project.status === ProjectStatus.ARCHIVED
  );

  // Count non-completed tasks with no project
  const unassignedTasksCount = tasks.filter(
    (task) => !task.projectId && task.status !== TaskStatus.COMPLETED
  ).length;

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="w-64 h-full bg-background border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button
              size="icon"
              onClick={() => {
                setSelectedProject(undefined);
                setIsModalOpen(true);
              }}
            >
              <HiPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <Button
              variant={!activeProject ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveProject(null)}
            >
              All Tasks
            </Button>
            <Button
              variant={
                activeProject?.id === NO_PROJECT.id ? "secondary" : "ghost"
              }
              className="w-full justify-start gap-2"
              onClick={() => setActiveProject(NO_PROJECT as Project)}
            >
              <HiFolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">No Project</span>
              <span className="text-xs text-muted-foreground">
                {unassignedTasksCount}
              </span>
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">
                Loading projects...
              </div>
            </div>
          ) : error ? (
            <div className="text-sm text-destructive p-2">{error.message}</div>
          ) : (
            <div className="space-y-4">
              {activeProjects.length > 0 && (
                <div className="space-y-1">
                  {activeProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={activeProject?.id === project.id}
                      onEdit={handleEditProject}
                      mappings={projectMappings[project.id] || []}
                      isSyncing={syncingProjects.has(project.id)}
                      onSync={handleSyncProject}
                    />
                  ))}
                </div>
              )}

              {archivedProjects.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-2">
                    Archived
                  </div>
                  {archivedProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={activeProject?.id === project.id}
                      onEdit={handleEditProject}
                      mappings={projectMappings[project.id] || []}
                      isSyncing={syncingProjects.has(project.id)}
                      onSync={handleSyncProject}
                    />
                  ))}
                </div>
              )}

              {projects.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No projects yet
                </div>
              )}

              {/* Remove from project drop zone */}
              <div
                {...removeProjectProps}
                className={cn(
                  "mt-4 border-2 border-dashed rounded-md p-4 text-center",
                  isOverRemove
                    ? "border-destructive bg-destructive/10"
                    : "border-muted hover:border-muted-foreground/50"
                )}
              >
                <p className="text-sm text-muted-foreground">
                  Drop here to remove from project
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(undefined);
        }}
        project={selectedProject}
      />
    </>
  );
}

interface ProjectItemProps {
  project: Project;
  isActive: boolean;
  onEdit: (project: Project) => void;
  mappings: TaskListMapping[];
  isSyncing: boolean;
  onSync: (projectId: string, mappingId: string) => void;
}

function ProjectItem({
  project,
  isActive,
  onEdit,
  mappings,
  isSyncing,
  onSync,
}: ProjectItemProps) {
  const { setActiveProject } = useProjectStore();
  const { tasks } = useTaskStore();
  const { droppableProps, isOver } = useDroppableProject(project);

  // Count non-completed tasks for this project
  const taskCount = tasks.filter(
    (task) =>
      task.projectId === project.id && task.status !== TaskStatus.COMPLETED
  ).length;

  // Check if project has any task mappings
  const hasMappings = mappings.length > 0;

  return (
    <div
      {...droppableProps}
      className={cn(
        "w-full px-3 py-2 rounded-md flex items-center space-x-2 group cursor-pointer",
        isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-muted",
        isOver && "ring-2 ring-ring"
      )}
      onClick={() => setActiveProject(project)}
    >
      {project.color && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
      )}
      <span className="truncate flex-1 project-name">{project.name}</span>
      <span className="text-xs text-muted-foreground">{taskCount}</span>

      {hasMappings && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={isSyncing}
          onClick={(e) => {
            e.stopPropagation();
            onSync(project.id, mappings[0].id);
          }}
        >
          <BsArrowRepeat
            className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
          />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(project);
        }}
      >
        <HiPencil className="h-3 w-3" />
      </Button>
    </div>
  );
}
