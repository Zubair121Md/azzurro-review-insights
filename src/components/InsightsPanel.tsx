import clsx from "clsx";
import { AlertTriangle, ArrowUpRight, CircleCheck, CircleMinus, CircleX, Sparkles } from "lucide-react";
import type { Insight, Period } from "@/lib/analytics";
import type { PropertyId } from "@/lib/properties";
import type { TopicId } from "@/lib/topics";

const TONE = {
  good: { icon: CircleCheck, cls: "text-emerald-600 bg-emerald-50" },
  bad: { icon: CircleX, cls: "text-rose-600 bg-rose-50" },
  neutral: { icon: CircleMinus, cls: "text-slate-500 bg-slate-100" },
  warning: { icon: AlertTriangle, cls: "text-amber-600 bg-amber-50" },
} as const;

export function InsightsPanel({
  insights,
  period,
  onTopic,
  onProperty,
  className,
}: {
  insights: Insight[];
  period: Period;
  onTopic: (t: TopicId) => void;
  onProperty: (p: PropertyId) => void;
  className?: string;
}) {
  return (
    <section className={clsx("card p-6", className)}>
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
          <Sparkles className="size-4" />
        </span>
        <h2 className="text-base font-semibold tracking-tight">
          What guests are saying <span className="font-normal text-slate-400">{period.label}</span>
        </h2>
      </div>
      <ul className="space-y-2.5">
        {insights.map((ins, i) => {
          const t = TONE[ins.tone];
          const Icon = t.icon;
          const action = ins.topic ? () => onTopic(ins.topic!) : ins.propertyId ? () => onProperty(ins.propertyId!) : undefined;
          return (
            <li key={i} className="group flex items-start gap-3">
              <span className={clsx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", t.cls)}>
                <Icon className="size-3.5" />
              </span>
              <p className="flex-1 text-[15px] leading-relaxed text-slate-700">
                {ins.text}
                {action && (
                  <button
                    type="button"
                    onClick={action}
                    className="ml-1.5 inline-flex items-center text-sm font-medium text-azure-600 opacity-80 hover:underline group-hover:opacity-100"
                  >
                    {ins.topic ? "See reviews" : "Focus"}
                    <ArrowUpRight className="size-3.5" />
                  </button>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
