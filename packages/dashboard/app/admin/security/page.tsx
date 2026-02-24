export default function SecurityPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Security</h1>
      <p className="text-muted-foreground mb-6">Security audit and vulnerability scanning.</p>

      <div className="rounded-lg border border-border p-6 bg-muted/20 mb-4">
        <h2 className="text-lg font-semibold mb-2">Security Audit</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Run a deep security analysis of your codebase. Covers dependency vulnerabilities,
          secret detection, injection patterns, authentication flows, and OWASP Top 10 checks.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <button
            disabled
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium opacity-50 cursor-not-allowed"
          >
            Run Security Audit
          </button>
          <span className="text-xs text-muted-foreground">Coming soon</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Planned capabilities:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>Dependency vulnerability scanning (npm audit, Snyk-style)</li>
            <li>Secret detection (API keys, tokens, credentials)</li>
            <li>Static analysis (CodeQL, Semgrep patterns)</li>
            <li>OWASP Top 10 checklist verification</li>
            <li>Trail of Bits security skills integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
