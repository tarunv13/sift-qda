import type { TranscriptionMode } from "../../lib/transcribeTypes";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

export interface FormValue {
  mode: TranscriptionMode;
  labelSpeakers: boolean;
  speakerCount: number;
  speakerNames: string;
  terms: string;
}

const MODES: { id: TranscriptionMode; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "hi-en", label: "Hindi and English mixed (Hinglish)" },
  { id: "hi-both", label: "Hindi, with an English translation" },
];

const FIELD = "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/40";

interface Props {
  file: string | null;
  onPick: () => void;
  value: FormValue;
  onChange: (value: FormValue) => void;
}

export function TranscribeForm({ file, onPick, value, onChange }: Props) {
  const set = (patch: Partial<FormValue>) => onChange({ ...value, ...patch });
  const fileName = file?.split(/[\\/]/).pop();

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onPick}>
          <Icon name="mic" size={13} />
          {file ? "Change audio" : "Choose audio…"}
        </Button>
        <span className="min-w-0 flex-1 truncate text-muted" title={fileName}>
          {fileName ?? "wav, mp3, m4a, flac, ogg, opus, aac or wma"}
        </span>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Language</span>
        <select value={value.mode} onChange={(e) => set({ mode: e.target.value as TranscriptionMode })} className={FIELD}>
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-ink">
        <input type="checkbox" checked={value.labelSpeakers} onChange={(e) => set({ labelSpeakers: e.target.checked })} />
        Label who is speaking
      </label>
      {value.labelSpeakers ? (
        <div className="animate-rise grid grid-cols-[5rem_1fr] gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Speakers</span>
            <input
              type="number"
              min={1}
              max={12}
              value={value.speakerCount}
              onChange={(e) => set({ speakerCount: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Names in order of speaking (optional)</span>
            <input value={value.speakerNames} onChange={(e) => set({ speakerNames: e.target.value })} placeholder="Interviewer, P01" className={FIELD} />
          </label>
        </div>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Names and terms to spell right (optional)</span>
        <input value={value.terms} onChange={(e) => set({ terms: e.target.value })} placeholder="Place names, organisations, jargon" className={FIELD} />
      </label>
    </div>
  );
}
