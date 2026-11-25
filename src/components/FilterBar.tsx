import clsx from "clsx";
import { Building2, CalendarDays } from "lucide-react";
import { PRESETS, type PresetId } from "@/lib/analytics";
import { addDays } from "@/lib/dates";
import type { PropertySnapshot } from "@/lib/types";
import type { PropertyFilter } from "./Dashboard";

const pill = (active: boolean) =>
  clsx(
    "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
    active ? "bg-white text-ink-900 shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white",
  );

export function FilterBar(props: {
  properties: PropertySnapshot[];
  property: PropertyFilter;
  onProperty: (p: PropertyFilter) => void;
  preset: PresetId;
  onPreset: (p: PresetId) => void;
  range?: { from: string; to: string };
  onCustom: (c: { from: string; to: string }) => void;
  today: string;
}) {
  const { properties, property, onProperty, preset, onPreset, range, onCustom, today } = props;
  const from = range?.from ?? (today ? addDays(today, -6) : "");
  const to = range?.to ?? today;

  return (
    <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="glass scrollbar-thin flex items-center gap-1 overflow-x-auto p-1 lg:shrink-0 lg:overflow-visible">
        <Building2 className="mx-2 size-4 shrink-0 text-white/50" />
        <button type="button" className={pill(property === "all")} onClick={() => onProperty("all")}>
          All properties
        </button>
        {properties.map((p) => (
          <button key={p.id} type="button" className={pill(property === p.id)} onClick={() => onProperty(p.id)}>
            <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: p.accent }} />
            {p.shortName}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="glass scrollbar-thin flex items-center gap-1 overflow-x-auto p-1">
          <CalendarDays className="mx-2 size-4 shrink-0 text-white/50" />
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={pill(preset === p.id)} onClick={() => onPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className={clsx("glass flex items-center gap-1 px-2 py-1 text-sm", preset === "custom" && "ring-1 ring-azure-400/60")}>
          <input
            type="date"
            aria-label="From date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && onCustom({ from: e.target.value, to })}
            className="rounded-md bg-transparent px-1 py-0.5 text-white/90 [color-scheme:dark] focus:outline-none"
          />
          <span className="text-white/40">→</span>
          <input
            type="date"
            aria-label="To date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => e.target.value && onCustom({ from, to: e.target.value })}
            className="rounded-md bg-transparent px-1 py-0.5 text-white/90 [color-scheme:dark] focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
