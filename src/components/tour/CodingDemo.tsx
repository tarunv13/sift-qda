import { Icon } from "../ui/Icon";

/** A looping illustration of coding: a passage gets highlighted and a code is attached to it. */
export function CodingDemo() {
  return (
    <div aria-hidden="true" className="mt-4 rounded-xl border border-line bg-paper px-4 py-3.5">
      <p className="font-reading text-[15px] leading-relaxed text-ink">
        “Honestly, the heat waves{" "}
        <span className="relative inline-block">
          <span className="demo-sweep absolute -inset-x-0.5 inset-y-0 rounded-sm" />
          <span className="relative">make me anxious</span>
        </span>{" "}
        every summer.”
      </p>
      <div className="demo-menu mt-2.5 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink shadow-md">
        <span className="h-2 w-2 rounded-full bg-[#c98500]" />
        Worry about the future
        <Icon name="check" size={13} className="demo-check text-accent" />
      </div>
    </div>
  );
}
