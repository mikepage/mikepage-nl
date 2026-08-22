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
    </head>
    <body>
      <div class="stars"></div>
      <div class="stars2"></div>
      <div class="stars3"></div>
      <div class="wrap">
        <header class="site">
          <a class="name" href="/">
            mikepage.nl
          </a>
          <span class="tagline">Building on the Cloudflare Developer Platform</span>
          <nav>
            <a href="/">Posts</a>
            <a href="/tools">Tools</a>
          </nav>
        </header>
        <main>{props.children}</main>
        <footer class="site">
          Built after dark by Mike Page, resident night owl 🦉 —{' '}
          <a href="https://github.com/mikepage">GitHub</a> ·{' '}
          <a href="https://github.com/mikepage/mikepage-nl">source for this site</a>
        </footer>
      </div>
    </body>
  </html>
)
