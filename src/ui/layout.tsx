import type { Child } from 'hono/jsx'

export const Layout = (props: { title: string; children: Child }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{props.title}</title>
      <link
        rel="icon"
        href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦉</text></svg>"
      />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Space+Grotesk:wght@400;500;700&display=swap"
      />
      <link rel="stylesheet" href="/styles.css" />
      <link rel="alternate" type="text/plain" href="/llms.txt" />
      <link rel="service-desc" type="application/json" href="/openapi.json" />
      <link rel="ai-catalog" href="/.well-known/ai-catalog.json" />
    </head>
    <body>
      <div class="stars"></div>
      <div class="stars2"></div>
      <div class="stars3"></div>
      <header id="bar" class="site-bar">
        <div class="mx-auto flex max-w-[60rem] items-center gap-4 px-6 py-3.5">
          <a class="font-display text-[1.25rem] font-semibold text-ink no-underline hover:text-glow" href="/">
            mikepage.nl
          </a>
          <nav class="ml-auto flex items-center gap-6">
            <a class="text-[0.95rem] text-muted no-underline hover:text-glow" href="/">
              Posts
            </a>
            <a class="text-[0.95rem] text-muted no-underline hover:text-glow" href="/platform">
              Platform
            </a>
            <a class="text-[0.95rem] text-muted no-underline hover:text-glow" href="/skills">
              Skills
            </a>
            <a class="text-[0.95rem] text-muted no-underline hover:text-glow" href="/experiments">
              Experiments
            </a>
          </nav>
        </div>
      </header>
      <div class="relative z-10 mx-auto max-w-[54rem] px-6 pt-12 pb-20">
        <main>{props.children}</main>
        <footer class="mt-24 border-t border-line pt-6 text-[0.95rem] text-muted">
          Built after dark by Mike Page, resident night owl 🦉 —{' '}
          <a href="https://github.com/mikepage">GitHub</a> ·{' '}
          <a href="https://github.com/mikepage/mikepage-nl">source for this site</a>
        </footer>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var b=document.getElementById('bar');var last=0;addEventListener('scroll',function(){var y=window.scrollY||0;if(y>last&&y>96)b.classList.add('is-hidden');else b.classList.remove('is-hidden');last=y},{passive:true})})()`,
        }}
      />
    </body>
  </html>
)
