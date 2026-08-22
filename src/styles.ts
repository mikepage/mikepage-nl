export const css = `
:root {
  --bg: #070d1f;
  --bg-deep: #030614;
  --fg: #e8ecf8;
  --muted: #8b96b8;
  --accent: #f6821f;
  --accent-soft: #ffb066;
  --border: #1d2a4d;
  --code-bg: #0d1530;
  --card: #0a1129;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  color: var(--fg);
  font: 18px/1.8 "Space Grotesk", system-ui, sans-serif;
  background: linear-gradient(180deg, var(--bg-deep) 0%, var(--bg) 40%, #0a1433 100%);
  min-height: 100vh;
  position: relative;
}

/* Star field: three parallax-ish layers of box-shadow stars */
.stars, .stars2, .stars3 {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.stars {
  background-image:
    radial-gradient(1px 1px at 12% 18%, #fff 50%, transparent 50%),
    radial-gradient(1px 1px at 28% 64%, #dbe4ff 50%, transparent 50%),
    radial-gradient(1.5px 1.5px at 41% 32%, #fff 50%, transparent 50%),
    radial-gradient(1px 1px at 57% 78%, #c9d6ff 50%, transparent 50%),
    radial-gradient(1px 1px at 66% 12%, #fff 50%, transparent 50%),
    radial-gradient(1.5px 1.5px at 79% 49%, #eef2ff 50%, transparent 50%),
    radial-gradient(1px 1px at 88% 84%, #fff 50%, transparent 50%),
    radial-gradient(1px 1px at 95% 27%, #dbe4ff 50%, transparent 50%);
  animation: twinkle 5s ease-in-out infinite alternate;
}
.stars2 {
  background-image:
    radial-gradient(1px 1px at 7% 82%, #fff 50%, transparent 50%),
    radial-gradient(1.5px 1.5px at 19% 41%, #ffd9ad 50%, transparent 50%),
    radial-gradient(1px 1px at 35% 91%, #fff 50%, transparent 50%),
    radial-gradient(1px 1px at 49% 8%, #c9d6ff 50%, transparent 50%),
    radial-gradient(1px 1px at 62% 56%, #fff 50%, transparent 50%),
    radial-gradient(1.5px 1.5px at 74% 23%, #eef2ff 50%, transparent 50%),
    radial-gradient(1px 1px at 83% 67%, #ffd9ad 50%, transparent 50%),
    radial-gradient(1px 1px at 93% 95%, #fff 50%, transparent 50%);
  animation: twinkle 7s ease-in-out infinite alternate-reverse;
}
.stars3 {
  background-image:
    radial-gradient(2px 2px at 23% 15%, rgba(255,255,255,.9) 50%, transparent 50%),
    radial-gradient(2px 2px at 71% 76%, rgba(255,214,170,.9) 50%, transparent 50%),
    radial-gradient(2px 2px at 52% 44%, rgba(219,228,255,.9) 50%, transparent 50%);
  animation: twinkle 9s ease-in-out infinite alternate;
}
@keyframes twinkle {
  from { opacity: 0.45; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .stars, .stars2, .stars3 { animation: none; }
}

.wrap {
  position: relative;
  z-index: 1;
  max-width: 46rem;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 5rem;
}
header.site {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 4.5rem;
}
header.site a.name {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 600;
  font-size: 1.5rem;
  letter-spacing: 0.01em;
  color: var(--fg);
  text-decoration: none;
}
header.site a.name:hover { color: var(--accent-soft); }
header.site .tagline {
  color: var(--muted);
  font-size: 0.95rem;
}

h1 {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 550;
  font-size: 2.6rem;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 0 0 1.5rem;
}
h2 {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 550;
  font-size: 1.5rem;
  margin-top: 3rem;
  margin-bottom: 0.75rem;
}
a { color: var(--accent-soft); text-decoration-color: rgba(246, 130, 31, 0.4); }
a:hover { color: var(--accent); }

.lede { font-size: 1.15rem; color: var(--muted); max-width: 38rem; }

ul.posts { list-style: none; padding: 0; margin-top: 3.5rem; }
ul.posts li {
  margin-bottom: 2rem;
  padding: 1.5rem 1.75rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
}
ul.posts a {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 550;
  font-size: 1.35rem;
  text-decoration: none;
}
.meta { color: var(--muted); font-size: 0.85rem; margin-top: 0.35rem; }
p.summary { margin: 0.6rem 0 0; color: var(--fg); }

article time { color: var(--muted); font-size: 0.95rem; display: block; margin-bottom: 2.5rem; }
article p { margin: 1.25rem 0; }

pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 1.25rem 1.4rem;
  border-radius: 12px;
  overflow-x: auto;
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 1.75rem 0;
}
code { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
p code, li code {
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 0.1em 0.4em;
  border-radius: 5px;
  font-size: 0.85em;
}

footer.site {
  margin-top: 6rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.95rem;
}
`
