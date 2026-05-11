/**
 * Editorial section divider: bold tick + small-caps eyebrow + Roman numeral.
 * Use as the opening header of every page section.
 */
type Props = {
  numeral?: string;
  eyebrow: string;
  title: string;
  caption?: string;
};

export function SectionRule({ numeral, eyebrow, title, caption }: Props) {
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-[3px] w-10 bg-ink" />
        <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
          {numeral ? `§ ${numeral} · ` : ""}
          {eyebrow}
        </span>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <div className="flex items-end justify-between gap-6">
        <h2
          className="font-display text-4xl leading-[0.95] text-ink md:text-5xl"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40, "WONK" 0' }}
        >
          <span className="italic">{title}</span>
        </h2>
        {caption ? (
          <p className="hidden max-w-xs text-right font-display text-sm italic text-ink-soft md:block">
            {caption}
          </p>
        ) : null}
      </div>
    </header>
  );
}
