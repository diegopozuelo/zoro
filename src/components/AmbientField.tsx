/**
 * Lightweight SVG ambient. Absolute (scrolls with page), not fixed.
 * Animations pause while html[data-scrolling] is set.
 */
export default function AmbientField() {
  return (
    <div className="ambient-field" aria-hidden>
      <div className="ambient-glow ambient-glow-a" />
      <div className="ambient-glow ambient-glow-b" />
      <svg
        className="ambient-waves"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="ambient-wave-group ambient-wave-group-a">
          <path d="M-180 220 C 0 160, 180 280, 360 220 S 720 160, 900 220 S 1260 280, 1440 220 S 1800 160, 1980 220" />
          <path d="M-180 400 C 0 340, 180 460, 360 400 S 720 340, 900 400 S 1260 460, 1440 400 S 1800 340, 1980 400" />
          <path d="M-180 580 C 0 520, 180 640, 360 580 S 720 520, 900 580 S 1260 640, 1440 580 S 1800 520, 1980 580" />
        </g>
        <g className="ambient-wave-group ambient-wave-group-b">
          <path d="M-180 300 C 40 250, 220 350, 400 300 S 760 250, 940 300 S 1300 350, 1480 300 S 1840 250, 2020 300" />
          <path d="M-180 520 C 40 470, 220 570, 400 520 S 760 470, 940 520 S 1300 570, 1480 520 S 1840 470, 2020 520" />
        </g>
      </svg>
    </div>
  )
}
