"use client";

import { FormEvent, useState } from "react";

import {
  Bot,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";

import { ApiError } from "@/lib/api";

import { askPatientCopilot } from "@/lib/copilot-api";

import type { CopilotMessage } from "@/types/copilot";

type PatientCopilotProps = {
  patientId: string;
  patientName?: string;
  onUnauthorized?: () => void;
};

const suggestedQuestions = [
  "Prepare me for a call with this patient.",
  "What should I follow up on?",
  "Summarize recent changes.",
  "What did the referral document say?",
];

function createMessageId() {
  return crypto.randomUUID();
}

export default function PatientCopilot({
  patientId,
  patientName,
  onUnauthorized,
}: PatientCopilotProps) {
  const [isOpen, setIsOpen] = useState(true);

  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<CopilotMessage[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function submitQuestion(value: string) {
    const trimmed = value.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: CopilotMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);

    setQuestion("");

    setError(null);

    setIsLoading(true);

    try {
      const response = await askPatientCopilot(patientId, trimmed);

      const assistantMessage: CopilotMessage = {
        id: createMessageId(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        onUnauthorized?.();

        return;
      }

      if (caughtError instanceof ApiError && caughtError.status === 503) {
        setError(
          caughtError.detail ??
            caughtError.message ??
            "Compass Copilot is temporarily unavailable. Please try again shortly.",
        );

        return;
      }

      if (caughtError instanceof ApiError && caughtError.status === 429) {
        setError(
          caughtError.detail ??
            caughtError.message ??
            "Compass Copilot request limit was reached. Please try again shortly.",
        );

        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Compass Copilot could not answer that question.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void submitQuestion(question);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sun-tint text-pine">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-ochre">
                AI Navigation Support
              </p>

              <span className="rounded-full bg-pine-tint px-2 py-0.5 text-[10px] font-semibold text-pine">
                Copilot
              </span>
            </div>

            <h2 className="mt-1 text-lg font-semibold text-ink">
              Compass Copilot
            </h2>

            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Ask grounded questions about {patientName ?? "this patient"}
              &apos;s Compass record.
            </p>
          </div>
        </div>

        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-ink-soft" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-ink-soft" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {messages.length === 0 && (
            <div className="p-5 sm:p-6">
              <div className="rounded-xl bg-pine-tint p-4">
                <div className="flex items-start gap-3">
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-pine" />

                  <div>
                    <p className="text-sm font-semibold text-pine-deep">
                      Navigator support, grounded in the patient record.
                    </p>

                    <p className="mt-1 text-sm leading-6 text-ink-soft">
                      Copilot can help summarize navigation needs, appointments,
                      check-ins, tasks, care journey information, and saved
                      document summaries.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-ink-soft">
                  Suggested questions
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedQuestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isLoading}
                      onClick={() => void submitQuestion(suggestion)}
                      className="rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-pine transition hover:bg-pine-tint disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="max-h-130 space-y-4 overflow-y-auto p-5 sm:p-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[88%] rounded-2xl rounded-br-md bg-pine px-4 py-3 text-sm leading-6 text-white"
                        : "max-w-[94%] rounded-2xl rounded-bl-md bg-surface-soft px-4 py-3 text-sm leading-6 text-ink"
                    }
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {message.role === "assistant" &&
                      message.sources &&
                      message.sources.length > 0 && (
                        <div className="mt-4 border-t border-border pt-3">
                          <p className="text-[10px] font-semibold text-ink-soft">
                            Based on
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {message.sources.map((source) => (
                              <span
                                key={source.source_id}
                                className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-ink-soft"
                              >
                                {source.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface-soft px-4 py-3 text-sm text-ink-soft">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Reviewing the Compass record...
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mx-5 mb-4 rounded-xl bg-sun-tint p-4 text-sm leading-6 text-pine-deep sm:mx-6">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="border-t border-border p-4 sm:p-5"
          >
            <div className="flex items-end gap-2">
              <div className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 transition focus-within:border-pine focus-within:bg-white">
                <MessageCircle className="h-4 w-4 shrink-0 text-ink-soft" />

                <textarea
                  value={question}
                  disabled={isLoading}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();

                      void submitQuestion(question);
                    }
                  }}
                  rows={1}
                  maxLength={1000}
                  placeholder="Ask Compass Copilot..."
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/60 disabled:cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pine text-white transition hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Ask Compass Copilot"
              >
                {isLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-5 text-ink-soft">
              AI-generated navigation support. Compass Copilot does not
              diagnose, recommend treatment, determine clinical urgency, or set
              Compass Attention Status.
            </p>
          </form>
        </div>
      )}
    </section>
  );
}
