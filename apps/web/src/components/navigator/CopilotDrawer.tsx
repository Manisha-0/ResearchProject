"use client";

import { useState } from "react";
import {
  Bot,
  ChevronRight,
  MessageSquareText,
  PhoneCall,
  Sparkles,
  X,
} from "lucide-react";

import {
  type CopilotPrompt,
  type CopilotResponse,
  getCopilotResponse,
} from "@/lib/copilot";

import type { Patient } from "@/lib/types";

type CopilotDrawerProps = {
  patient: Patient;
};

export function CopilotDrawer({ patient }: CopilotDrawerProps) {
  const [open, setOpen] = useState(false);

  const [response, setResponse] = useState<CopilotResponse | null>(null);

  function ask(prompt: CopilotPrompt) {
    setResponse(getCopilotResponse(patient, prompt));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine-deep"
      >
        <Sparkles className="h-4 w-4" />
        Ask Compass Copilot
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close Compass Copilot"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-pine-deep/30 backdrop-blur-[1px]"
          />

          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun-tint">
                  <Bot className="h-5 w-5 text-pine" />
                </div>

                <div>
                  <p className="font-semibold text-pine-deep">
                    Compass Copilot
                  </p>

                  <p className="text-xs text-ink-soft">
                    Grounded in {patient.firstName}&apos;s Compass record
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-surface-soft hover:text-pine"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {!response ? (
                <>
                  <div className="rounded-2xl bg-pine-tint p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-pine" />

                      <p className="text-sm font-semibold text-pine-deep">
                        Ask about this patient
                      </p>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      Choose a grounded question for the current synthetic
                      Compass record.
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <PromptButton
                      icon={<MessageSquareText />}
                      title="What needs attention today?"
                      onClick={() => ask("attention")}
                    />

                    <PromptButton
                      icon={<PhoneCall />}
                      title={`Prepare my call with ${patient.firstName}`}
                      onClick={() => ask("call_prep")}
                    />

                    <PromptButton
                      icon={<Sparkles />}
                      title="What changed since the last check-in?"
                      onClick={() => ask("changes")}
                    />
                  </div>
                </>
              ) : (
                <CopilotAnswer
                  response={response}
                  onBack={() => setResponse(null)}
                />
              )}
            </div>

            <footer className="border-t border-border px-5 py-4">
              <p className="text-xs leading-5 text-ink-soft">
                Prototype Copilot summarizes synthetic navigation data. It does
                not make clinical decisions or determine Navigation Priority.
              </p>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}

function PromptButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition hover:border-pine/25 hover:bg-surface-soft"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pine-tint [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-pine">
        {icon}
      </div>

      <span className="flex-1 text-sm font-semibold text-ink">{title}</span>

      <ChevronRight className="h-4 w-4 text-ink-soft/50 transition group-hover:translate-x-1 group-hover:text-pine" />
    </button>
  );
}

function CopilotAnswer({
  response,
  onBack,
}: {
  response: CopilotResponse;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-pine"
      >
        ← Ask another question
      </button>

      <div className="mt-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-tint">
          <Sparkles className="h-5 w-5 text-pine" />
        </div>

        <h2 className="mt-4 text-xl font-semibold text-pine-deep">
          {response.title}
        </h2>

        {response.intro && (
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            {response.intro}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {response.bullets.map((bullet, index) => (
            <div
              key={`${index}-${bullet}`}
              className="flex gap-3 rounded-xl bg-surface-soft p-4"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-white">
                {index + 1}
              </div>

              <p className="text-sm leading-6 text-ink">{bullet}</p>
            </div>
          ))}
        </div>

        {response.footer && (
          <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-ink-soft">
            {response.footer}
          </p>
        )}
      </div>
    </div>
  );
}
