"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

function preprocessForStreaming(content: string): string {
  let processed = content;
  const codeBlockCount = (processed.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    processed += "\n```";
  }
  return processed;
}

const MemoizedMarkdown = memo(
  ReactMarkdown,
  (prev, next) => prev.children === next.children,
);

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const value = String(children).replace(/\n$/, "");

  if (!value.includes("\n")) {
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between bg-muted/80 px-4 py-1.5">
        <span className="text-xs text-muted-foreground font-mono">
          {language || "text"}
        </span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Copy
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.8125rem",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  const processed = useMemo(
    () => (isStreaming ? preprocessForStreaming(text) : text),
    [text, isStreaming],
  );

  if (!text.trim()) {
    return null;
  }

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-2 prose-pre:p-0 prose-pre:bg-transparent prose-code:before:content-none prose-code:after:content-none prose-headings:mb-2 prose-headings:mt-4 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-2"
      data-testid="streaming-text"
    >
      <MemoizedMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock as any,
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
        }}
      >
        {processed}
      </MemoizedMarkdown>
      {isStreaming && <span className="animate-pulse ml-1">|</span>}
    </div>
  );
}
