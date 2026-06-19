import { useCallback, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "transcribing";

const pickMimeType = (): string | null => {
  const candidates = ["audio/webm", "audio/mp4", "audio/aac", "audio/mpeg"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return null;
};

const extFor = (mime: string): string => {
  const m = mime.split(";")[0];
  return (
    {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/aac": "aac",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
    } as Record<string, string>
  )[m] ?? "webm";
};

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    const mimeType = pickMimeType();
    if (!mimeType) {
      throw new Error("Your browser doesn't support a compatible audio format.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      throw new Error("Microphone permission denied.");
    }
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    recorderRef.current = recorder;
    setState("recording");
  }, [state]);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current;
      if (!recorder) return reject(new Error("Not recording"));
      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        resolve(blob);
      };
      recorder.onerror = (ev) => reject((ev as ErrorEvent).error ?? new Error("Recorder error"));
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {
      // ignore
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setState("idle");
  }, []);

  const stopAndTranscribe = useCallback(async (): Promise<string> => {
    setState("transcribing");
    try {
      const blob = await stop();
      if (blob.size < 1024) {
        setState("idle");
        throw new Error("That recording was too short — please try again.");
      }
      const ext = extFor(blob.type);
      const fd = new FormData();
      fd.append("file", blob, `recording.${ext}`);

      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: fd,
      });
      if (error) throw new Error(error.message || "Transcription failed");
      const text = (data as { text?: string })?.text ?? "";
      setState("idle");
      return text.trim();
    } catch (err) {
      setState("idle");
      throw err;
    }
  }, [stop]);

  return { state, start, stopAndTranscribe, cancel };
}
