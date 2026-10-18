"use client";

import {
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CallTranscript } from "@/components/calls/CallTranscript";
import { ApiError } from "@/lib/api";
import { endCall, replyToCall, startCall } from "@/lib/reminder-call-api";

import type {
  ReminderCallDetail,
  ReminderCallMode,
  ReminderCallTurn,
  UpcomingCallItem,
} from "@/types/reminder-call";

/*
 * Runs a reminder call in the browser instead of over the
 * phone. The backend conversation is exactly the same one a
 * real phone call uses; only the voice in and out differs.
 *
 * Voice out: the browser's speechSynthesis.
 * Voice in:  the browser's SpeechRecognition (Chrome, Edge).
 * Both are optional; typed and tapped answers always work.
 */

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

function createRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function CallSimulator({
  item,
  mode = "scripted",
  onClose,
}: {
  item: UpcomingCallItem;
  mode?: ReminderCallMode;
  onClose: (changed: boolean) => void;
}) {
  const [call, setCall] = useState<ReminderCallDetail | null>(null);
  const [turn, setTurn] = useState<ReminderCallTurn | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakAloud, setSpeakAloud] = useState(true);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);

  const recognitionRef = useRef<Recognition | null>(null);
  const startedRef = useRef(false);
  const speakAloudRef = useRef(speakAloud);

  useEffect(() => {
    speakAloudRef.current = speakAloud;
  }, [speakAloud]);

  const done = turn?.done ?? false;

  const stopVoice = useCallback(() => {
    recognitionRef.current?.abort();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setListening(false);
  }, []);

  const listen = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.start();
      setListening(true);
    } catch {
      // Already listening.
    }
  }, []);

  const speak = useCallback(
    (text: string, thenListen: boolean) => {
      if (!text) return;
      const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

      if (!speakAloudRef.current || !synth) {
        if (thenListen) listen();
        return;
      }

      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92; // a little slower, like a careful caller
      utterance.lang = "en-US";
      utterance.onend = () => {
        if (thenListen) listen();
      };
      synth.speak(utterance);
    },
    [listen],
  );

  const applyTurn = useCallback(
    (next: ReminderCallTurn) => {
      setTurn(next);
      setCall(next.call);
      speak(next.say, !next.done);
    },
    [speak],
  );

  const send = useCallback(
    async (text: string, digits?: string) => {
      if (!call || done) return;
      stopVoice();
      setBusy(true);
      setError(null);
      try {
        applyTurn(await replyToCall(call.id, text, digits));
        setTyped("");
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "The answer could not be sent.");
      } finally {
        setBusy(false);
      }
    },
    [applyTurn, call, done, stopVoice],
  );

  // Start the call once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const recognition = createRecognition();
    recognitionRef.current = recognition;
    setCanListen(Boolean(recognition));

    startCall(item.appointment_id, "simulated", mode)
      .then(applyTurn)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "The call could not start."),
      )
      .finally(() => setBusy(false));
  }, [applyTurn, item.appointment_id, mode]);

  // Wire speech results to the latest send().
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = (event) => {
      const heard = event.results[0]?.[0]?.transcript ?? "";
      void send(heard);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
  }, [send]);

  useEffect(() => () => stopVoice(), [stopVoice]);

  async function hangUp() {
    stopVoice();
    if (call && !done) {
      try {
        await endCall(call.id);
      } catch {
        // The call will be closed as stale by the server.
      }
    }
    onClose(Boolean(call));
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") void hangUp();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const name = item.patient_first_name;
  const expects = turn?.expects ?? "yes_no";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-[14px] bg-white sm:rounded-[14px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="sim-title" className="text-lg font-bold text-ink">
              Practice call with {name} {item.patient_last_name}
            </h2>
            <p className="text-sm text-ink-soft">
              {mode === "agent"
                ? "AI agent caller. Talk to it the way a patient would."
                : "Fixed questions, the same as a phone call."}{" "}
              Answers are saved to the patient record.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void hangUp()}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-soft"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {call && (
            <CallTranscript entries={call.transcript} patientName={name} answeredBy={call.answered_by} live />
          )}

          {busy && !call && (
            <p className="flex items-center gap-2 text-ink-soft">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Dialling…
            </p>
          )}
          {mode === "agent" && call?.used_fallback && (
            <p className="mt-4 rounded-lg bg-priority-medium-tint p-3 text-sm text-ink">
              The AI agent stopped, so this call continued with the fixed
              questions.
              {call.fallback_reason && (
                <span className="mt-1 block break-words font-semibold">
                  Error: {call.fallback_reason}
                </span>
              )}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-priority-high-tint p-3 text-priority-high">
              {error}
            </p>
          )}

          {done && call && (
            <div
              className={`mt-6 rounded-[10px] p-4 ${call.safety_flag ? "bg-priority-high-tint" : "bg-pine-tint"}`}
            >
              <p className="font-semibold text-ink">Call finished</p>
              <p className="mt-1 text-ink">{call.summary}</p>
              {call.check_in_id && (
                <p className="mt-2 text-sm text-ink-soft">
                  Saved as a check-in. The patient&apos;s attention status has
                  been updated.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-border px-5 py-4 sm:px-6">
          {!done ? (
            <>
              <div className="flex flex-wrap gap-2">
                {expects === "agent" ? (
                  <>
                    <QuickAnswer disabled={busy} onClick={() => void send("yes")}>Yes</QuickAnswer>
                    <QuickAnswer disabled={busy} onClick={() => void send("no")}>No</QuickAnswer>
                    <QuickAnswer disabled={busy} onClick={() => void send("I'm not sure")}>Not sure</QuickAnswer>
                    <QuickAnswer disabled={busy} onClick={() => void send("this is her daughter")}>
                      A family member
                    </QuickAnswer>
                    <QuickAnswer disabled={busy} onClick={() => void send("Can I talk to a real person?")}>
                      Ask for a person
                    </QuickAnswer>
                  </>
                ) : expects === "number"
                  ? Array.from({ length: 11 }, (_, n) => (
                      <QuickAnswer key={n} disabled={busy} onClick={() => void send(String(n))}>
                        {n}
                      </QuickAnswer>
                    ))
                  : expects === "free_text"
                    ? <QuickAnswer disabled={busy} onClick={() => void send("no")}>Nothing else</QuickAnswer>
                    : (
                      <>
                        <QuickAnswer disabled={busy} onClick={() => void send("yes")}>Yes</QuickAnswer>
                        <QuickAnswer disabled={busy} onClick={() => void send("no")}>No</QuickAnswer>
                        {expects === "identity" ? (
                          <QuickAnswer disabled={busy} onClick={() => void send("this is her daughter")}>
                            A family member
                          </QuickAnswer>
                        ) : (
                          <QuickAnswer disabled={busy} onClick={() => void send("not sure")}>Not sure</QuickAnswer>
                        )}
                      </>
                    )}
              </div>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (typed.trim()) void send(typed.trim());
                }}
              >
                {canListen && (
                  <button
                    type="button"
                    onClick={() => (listening ? stopVoice() : listen())}
                    disabled={busy}
                    aria-pressed={listening}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 font-semibold ${listening ? "bg-priority-high text-white" : "bg-pine-tint text-pine"}`}
                  >
                    {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    <span className="hidden sm:inline">{listening ? "Stop" : "Speak"}</span>
                  </button>
                )}

                <label className="sr-only" htmlFor="sim-answer">Answer</label>
                <input
                  id="sim-answer"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  disabled={busy}
                  placeholder={listening ? "Listening…" : "Type what the patient says"}
                  className="min-h-12 min-w-0 flex-1 rounded-lg border-2 border-border px-3 focus:border-pine focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !typed.trim()}
                  className="rounded-lg bg-pine px-4 font-semibold text-white disabled:opacity-40"
                >
                  Answer
                </button>
              </form>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSpeakAloud((value) => !value);
                    window.speechSynthesis?.cancel();
                  }}
                  className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
                >
                  {speakAloud ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {speakAloud ? "Voice on" : "Voice off"}
                </button>

                <button
                  type="button"
                  onClick={() => void hangUp()}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-priority-high hover:bg-priority-high-tint"
                >
                  <PhoneOff className="h-4 w-4" /> Hang up
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onClose(true)}
              className="w-full rounded-lg bg-pine py-3 font-semibold text-white"
            >
              Close
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function QuickAnswer({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-11 min-w-11 rounded-lg border-2 border-border px-3 font-semibold text-ink hover:border-pine-soft disabled:opacity-40"
    >
      {children}
    </button>
  );
}
