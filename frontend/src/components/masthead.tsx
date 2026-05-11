/**
 * Newspaper-style masthead strip — always at the very top of the document.
 * Shows edition, dateline, and a fixed coordinate marker.
 */
export function Masthead() {
  return (
    <div className="border-b border-ink/15 bg-paper-deep/60 backdrop-blur supports-[backdrop-filter]:bg-paper-deep/40">
      <div className="container flex h-7 items-center justify-between font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        <span>
          <span className="text-ink">PanenCerdas</span> · Buletin Prediksi Panen · Edisi 01
        </span>
        <span className="hidden sm:inline">
          Rabu, 11 Mei 2026 · Musim Tanam I
        </span>
        <span>
          08°S <span className="text-rule">·</span> 107°E
        </span>
      </div>
    </div>
  );
}
