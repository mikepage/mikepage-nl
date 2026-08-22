import { Hono } from 'hono'
import { Layout } from './components/layout'
import { posts, findPost } from './posts'
import { tools } from './tools'
// @ts-expect-error text module — bundled by wrangler's Text rule (see wrangler.jsonc)
import css from './styles.generated.css'

const app = new Hono()

app.get('/styles.css', (c) =>
  c.text(css, 200, { 'Content-Type': 'text/css; charset=utf-8' })
)

app.get('/', (c) =>
  c.html(
    <Layout title="mikepage.nl — Building on the Cloudflare Developer Platform">
      <h1>Fun with the Cloudflare Developer Platform</h1>
      <p class="lede">
        Hands-on examples for Workers, Durable Objects, D1, R2 and friends — every post ships
        with working code, and demos run live on this very Worker.
      </p>
      <ul class="posts">
        {posts.map((post) => (
          <li>
            <a href={`/posts/${post.slug}`}>{post.title}</a>
            <div class="meta">{post.date}</div>
            <p class="summary">{post.summary}</p>
          </li>
        ))}
      </ul>
    </Layout>
  )
)

app.get('/posts/:slug', (c) => {
  const post = findPost(c.req.param('slug'))
  if (!post) return c.notFound()
  return c.html(
    <Layout title={`${post.title} — mikepage.nl`}>
      <article>
        <h1>{post.title}</h1>
        <time datetime={post.date}>{post.date}</time>
        <post.Body />
      </article>
    </Layout>
  )
})

app.get('/tools', (c) =>
  c.html(
    <Layout title="Tools — mikepage.nl">
      <h1>Tools</h1>
      <p class="lede">
        Small network and email utilities, each one a live example of a Cloudflare Workers pattern — running on this very
        Worker.
      </p>
      <ul class="posts">
        {tools.map((tool) => (
          <li>
            <a href={`/tools/${tool.slug}`}>{tool.title}</a>
            <div class="meta">⚡ {tool.pattern}</div>
            <p class="summary">{tool.summary}</p>
          </li>
        ))}
      </ul>
    </Layout>
  )
)

for (const tool of tools) {
  app.route(`/tools/${tool.slug}`, tool.router)
}

for (const post of posts) {
  if (post.demo) app.route(`/demos/${post.slug}`, post.demo)
}

app.notFound((c) =>
  c.html(
    <Layout title="Not found — mikepage.nl">
      <h1>404 — hoo?</h1>
      <p>
        🦉 The owl looked everywhere, but this page isn't perched anywhere.{' '}
        <a href="/">Fly back to the posts</a>.
      </p>
    </Layout>,
    404
  )
)

export default app
