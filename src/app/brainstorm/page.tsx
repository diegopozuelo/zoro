import Brainstorm from '@/components/Brainstorm'
import AmbientField from '@/components/AmbientField'

export default function BrainstormPage() {
  return (
    <div className="hud-stage hud-stage-bleed">
      <AmbientField />
      <div className="hud-grid" aria-hidden />
      <div className="hud-scan" aria-hidden />

      <div className="hud-content mx-auto max-w-6xl">
        <header className="hero-command motion-fade-in-slow relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_55%,transparent)] p-5 sm:p-7 backdrop-blur-sm">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="hero-glow opacity-60" aria-hidden />
          <div className="hero-orbit hero-orbit-c opacity-50" aria-hidden />

          <div className="relative z-[1] status-rail text-xs text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[var(--accent-dim)] px-3 py-1 font-mono-metric tracking-wide text-[var(--accent)]">
              <span className="live-dot !bg-[var(--accent)] !shadow-[0_0_10px_var(--accent)]" />
              IDEAS
            </span>
            <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
              ZORO // BRAINSTORM
            </span>
          </div>

          <div className="relative z-[1] mt-6">
            <p className="eyebrow eyebrow-accent">Idea vault</p>
            <h1 className="hero-title mt-2 font-display text-5xl tracking-tight text-[var(--ink)] sm:text-6xl">
              Brainstorm
            </h1>
            <div className="hero-title-rule mt-3" aria-hidden />
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
              Capture ideas, routine tweaks, and anything worth remembering. Tag them so you can scan fast later.
            </p>
          </div>
        </header>

        <Brainstorm />
      </div>
    </div>
  )
}
