"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PendingQuestion } from "@/app/hooks/use-chat-stream";

interface QuestionCardProps {
  question: PendingQuestion;
  onAnswer: (answer: string) => void;
  onDismiss: () => void;
}

export function QuestionCard({ question, onAnswer, onDismiss }: QuestionCardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (label: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (question.multiple) {
        next.has(label) ? next.delete(label) : next.add(label);
      } else {
        next.clear();
        next.add(label);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    const answer = Array.from(selected).join(", ");
    onAnswer(answer);
  };

  return (
    <div className="flex justify-start mb-4" data-testid="question-card">
      <div className="max-w-[85%] rounded-lg border border-primary/30 bg-card p-4">
        <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">
          {question.header}
        </div>
        <div className="text-sm font-medium mb-3">{question.question}</div>

        <div className="space-y-2 mb-3">
          {question.options.map((opt) => {
            const isSelected = selected.has(opt.label);
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => toggle(opt.label)}
                className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:bg-muted text-foreground"
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                {opt.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {opt.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={selected.size === 0}
          >
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
