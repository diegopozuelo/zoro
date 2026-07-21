import AmbientField from '@/components/AmbientField'

/** Shared page chrome: ambient scrolls with content (not fixed under it). */
export default function HudShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hud-stage hud-stage-bleed">
      <AmbientField />
      <div className="hud-content mx-auto max-w-6xl">{children}</div>
    </div>
  )
}
