import { useProject } from "../../state/ProjectContext";
import { Icon } from "../ui/Icon";

const tones = {
  info: "border-line bg-surface/95 text-ink",
  success: "border-accent/30 bg-accent-soft/95 text-ink",
  error: "border-danger/30 bg-surface/95 text-danger",
};

export function Notices() {
  const { notices, dismiss } = useProject();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {notices.map((notice) => (
        <div
          key={notice.id}
          role={notice.tone === "error" ? "alert" : "status"}
          className={`animate-drop pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-lg backdrop-blur ${tones[notice.tone]}`}
        >
          {notice.tone === "success" ? <Icon name="check" size={16} className="mt-0.5 text-accent" /> : null}
          <span className="flex-1 whitespace-pre-line select-text">{notice.message}</span>
          <button
            type="button"
            onClick={() => dismiss(notice.id)}
            aria-label="Dismiss"
            className="mt-0.5 text-muted transition-colors hover:text-ink"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
