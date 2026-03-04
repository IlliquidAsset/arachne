"use client";
import { useEffect, useState } from "react";

interface ScheduledTask {
  id: number;
  name: string;
  description: string | null;
  prompt: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  project: string | null;
  agent: string | null;
  skills: string[] | null;
  lastRun: string | null;
  lastStatus: string | null;
  lastError: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskForm {
  name: string;
  description: string;
  prompt: string;
  cronExpression: string;
  timezone: string;
  project: string;
  agent: string;
}

const EMPTY_FORM: TaskForm = {
  name: "",
  description: "",
  prompt: "",
  cronExpression: "06:00",
  timezone: "America/New_York",
  project: "",
  agent: "",
};

const STATUS_COLORS: Record<string, string> = {
  success: "text-green-400",
  failed: "text-red-400",
  running: "text-blue-400",
  skipped: "text-yellow-400",
};

export default function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; status: string; message: string } | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/scheduled-tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } catch {
      // ignore
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(task: ScheduledTask) {
    setForm({
      name: task.name,
      description: task.description ?? "",
      prompt: task.prompt,
      cronExpression: task.cronExpression,
      timezone: task.timezone,
      project: task.project ?? "",
      agent: task.agent ?? "",
    });
    setEditingId(task.id);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.prompt.trim() || !form.cronExpression.trim()) {
      setError("Name, prompt, and schedule are required.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      prompt: form.prompt.trim(),
      cronExpression: form.cronExpression.trim(),
      timezone: form.timezone,
      project: form.project.trim() || undefined,
      agent: form.agent.trim() || undefined,
    };

    try {
      const url = editingId ? `/api/scheduled-tasks/${editingId}` : "/api/scheduled-tasks";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save task");
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setSuccess(editingId ? "Task updated." : "Task created.");
      fetchTasks();
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(task: ScheduledTask) {
    try {
      await fetch(`/api/scheduled-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !task.enabled }),
      });
      fetchTasks();
    } catch {
      // ignore
    }
  }

  async function handleDelete(task: ScheduledTask) {
    try {
      await fetch(`/api/scheduled-tasks/${task.id}`, { method: "DELETE" });
      setSuccess(`"${task.name}" deleted.`);
      fetchTasks();
    } catch {
      setError("Failed to delete task.");
    }
  }

  async function handleTestRun(task: ScheduledTask) {
    setTestingId(task.id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/scheduled-tasks/${task.id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ id: task.id, status: "success", message: data.message ?? "Test dispatched successfully." });
        fetchTasks();
      } else {
        setTestResult({ id: task.id, status: "failed", message: data.error ?? "Test failed." });
      }
    } catch {
      setTestResult({ id: task.id, status: "failed", message: "Request failed." });
    } finally {
      setTestingId(null);
    }
  }

  function formatLastRun(task: ScheduledTask): string {
    if (!task.lastRun) return "Never";
    return new Date(task.lastRun + "Z").toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Scheduled Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Recurring tasks that run on a schedule. Dispatched as agent prompts.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          New Task
        </button>
      </div>

      {success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 mb-4 text-sm text-green-400">
          {success}
        </div>
      )}

      {error && !showForm && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-muted/20 p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Task" : "New Scheduled Task"}
          </h2>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 mb-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="daily-job-search"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Search and apply to job postings"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-1">Prompt</label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder="The task prompt that will be dispatched to the agent..."
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Schedule (HH:MM or cron)
              </label>
              <input
                type="text"
                value={form.cronExpression}
                onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
                placeholder="06:00"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                HH:MM for daily, or cron: &quot;0 6 * * *&quot;
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Timezone</label>
              <input
                type="text"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="America/New_York"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Project <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <input
                type="text"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                placeholder="Auto-routed if empty"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Agent <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <input
                type="text"
                value={form.agent}
                onChange={(e) => setForm({ ...form, agent: e.target.value })}
                placeholder="Auto-selected if empty"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setError(null);
              }}
              className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      {tasks.length === 0 && !showForm ? (
        <div className="rounded-lg border border-border p-8 bg-muted/20 text-center">
          <p className="text-sm text-muted-foreground mb-3">No scheduled tasks yet.</p>
          <button
            onClick={openCreate}
            className="text-sm text-primary hover:underline"
          >
            Create your first scheduled task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-lg border border-border bg-muted/20 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggle(task)}
                    className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${
                      task.enabled ? "bg-green-500" : "bg-muted-foreground/30"
                    }`}
                    title={task.enabled ? "Disable" : "Enable"}
                  >
                    <span
                      className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        task.enabled ? "translate-x-[18px]" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{task.name}</span>
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {task.cronExpression}
                      </code>
                      <span className="text-xs text-muted-foreground">{task.timezone}</span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className="text-right text-xs">
                    <div className="text-muted-foreground">
                      Last: {formatLastRun(task)}
                    </div>
                    {task.lastStatus && (
                      <div className={STATUS_COLORS[task.lastStatus] ?? "text-muted-foreground"}>
                        {task.lastStatus} ({task.runCount} runs)
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleTestRun(task)}
                    disabled={testingId === task.id}
                    className="text-xs text-blue-400/70 hover:text-blue-400 px-2 py-1 disabled:opacity-50"
                    title="Run this task now (test)"
                  >
                    {testingId === task.id ? "Running..." : "Test"}
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    {expandedId === task.id ? "Less" : "More"}
                  </button>
                  <button
                    onClick={() => openEdit(task)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="text-xs text-red-400/70 hover:text-red-400 px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedId === task.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-muted-foreground">Prompt:</span>
                      <pre className="mt-1 p-2 rounded bg-muted text-xs whitespace-pre-wrap">
                        {task.prompt}
                      </pre>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-muted-foreground">Project:</span>{" "}
                        {task.project || "auto-routed"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Agent:</span>{" "}
                        {task.agent || "auto-selected"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Skills:</span>{" "}
                        {task.skills?.join(", ") || "none"}
                      </div>
                    </div>
                    {task.lastError && (
                      <div>
                        <span className="text-red-400">Last error:</span>{" "}
                        <span className="text-red-400/70">{task.lastError}</span>
                      </div>
                    )}
                    {testResult?.id === task.id && (
                      <div className={`rounded-md px-2 py-1 ${testResult.status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        Test: {testResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
