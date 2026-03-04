"use client";
import { useEffect, useState } from "react";

interface NotionStatus {
  connected: boolean;
  workspaceName?: string | null;
  connectedAt?: string;
  tokenPreview?: string;
}

export default function IntegrationsPage() {
  const [notion, setNotion] = useState<NotionStatus | null>(null);
  const [token, setToken] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/integrations/notion");
      if (res.ok) {
        const data = await res.json();
        setNotion(data);
      }
    } catch {
      // ignore
    }
  }

  async function handleConnect() {
    if (!token.trim()) {
      setError("Please enter a Notion integration token.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/integrations/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      setNotion(data);
      setToken("");
      setShowForm(false);
      setSuccess("Notion connected successfully!");
    } catch {
      setError("Request failed. Check your network connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await fetch("/api/integrations/notion", { method: "DELETE" });
      setNotion({ connected: false });
      setSuccess("Notion disconnected.");
    } catch {
      setError("Failed to disconnect.");
    } finally {
      setLoading(false);
    }
  }

  const connectedAt = notion?.connectedAt
    ? new Date(notion.connectedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Integrations</h1>
      <p className="text-muted-foreground mb-6">
        Connect external services to give your agents access to more tools.
      </p>

      {success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 mb-4 text-sm text-green-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Notion Card */}
      <div className="rounded-lg border border-border bg-muted/20 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center text-xl">
              N
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notion</h2>
              <p className="text-sm text-muted-foreground">
                Search, read, create, and update Notion pages and databases.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                notion?.connected ? "bg-green-500" : "bg-muted-foreground/40"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {notion?.connected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {notion?.connected ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Workspace:</span>{" "}
                <span className="font-medium">{notion.workspaceName || "Unknown"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Connected:</span>{" "}
                <span className="font-medium">{connectedAt}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Token:</span>{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {notion.tokenPreview}
                </code>
              </div>
            </div>

            <div className="pt-2 border-t border-border mt-3">
              <p className="text-xs text-muted-foreground mb-3">
                Tools available: <code>arachne_notion_search</code>, <code>arachne_notion_read</code>,{" "}
                <code>arachne_notion_create</code>, <code>arachne_notion_update</code>,{" "}
                <code>arachne_notion_query_db</code>
              </p>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-3 py-1.5 rounded-md border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {loading ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {showForm ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1.5">
                    Internal Integration Token
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ntn_..."
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConnect();
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Create an internal integration at{" "}
                    <a
                      href="https://www.notion.so/my-integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      notion.so/my-integrations
                    </a>{" "}
                    and paste the secret here.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Testing..." : "Test & Save"}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setToken("");
                      setError(null);
                    }}
                    className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Connect Notion
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
