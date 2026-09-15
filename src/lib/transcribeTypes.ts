export interface TranscriberStatus {
  folder: string | null;
  ready: boolean;
  problem: string | null;
}

export type TranscriptionMode = "en" | "hi" | "hi-en" | "hi-both";

export interface TranscriptionOptions {
  mode: TranscriptionMode;
  /** Label speakers; a number fixes how many there are. */
  speakers: number | null;
  speakerNames: string | null;
  /** Names and terms that help the model spell things right. */
  prompt: string | null;
}

export interface TranscriptionProgress {
  percent: number;
  done: string;
  total: string;
  remaining: string | null;
}

export interface TranscriptionEvent {
  jobId: string;
  progress: TranscriptionProgress;
}

/** Stored in a transcript source's metadata: where each paragraph starts in the audio. */
export interface TranscriptMeta {
  mode: string;
  /** [code-point offset, seconds] pairs in text order. */
  starts: [number, number][];
}

export const AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "flac", "ogg", "opus", "aac", "wma"];
