"use client";

import { useState } from "react";
import { useList } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  createActiveTasksData,
  formatDuration,
  getStatusIcon,
} from "@arachne/web/src/components/ActiveTasks";
import type { TaskInfo } from "@arachne/web/src/api/types";
import type { TaskFilter, TaskCardData } from "@arachne/web/src/components/ActiveTasks";

const FILTER_TABS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Done" },
  { value: "failed", label: "Failed" },
];

const STATUS_BADGE_VARIANT: Record<TaskInfo["status"], "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
};

function TaskItem({ task }: { task: TaskCardData }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Badge variant={STATUS_BADGE_VARIANT[task.status]} className="text-[10px] px-1.5 shrink-0">
        {task.status}
      </Badge>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate block">
          {task.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {task.project} &middot; {task.track} &middot; {task.duration}
        </span>
      </div>
    </div>
  );
}

export function ActiveTasks() {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const { query, result } = useList<TaskInfo>({
    resource: "tasks",
  });

  const tasks = result.data ?? [];
  const tasksData = createActiveTasksData(tasks, filter);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Tasks
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {tasksData.runningCount} running / {tasksData.totalCount} total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Loading...
          </p>
        )}
        {query.isError && (
          <p className="text-xs text-destructive">Failed to load tasks</p>
        )}
        {!query.isLoading && !query.isError && (
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as TaskFilter)}
          >
            <TabsList className="w-full">
              {FILTER_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {FILTER_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <div className="divide-y divide-border mt-2">
                  {tasksData.tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No {tab.value === "all" ? "" : tab.label.toLowerCase() + " "}tasks
                    </p>
                  ) : (
                    tasksData.tasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
