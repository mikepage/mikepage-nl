import type { Child } from 'hono/jsx'
import type { Experiment } from '../experiments/types'

export const ExperimentShell = (props: { experiment: Experiment; children: Child }) => (
  <>
    <p class="meta">
      <a href="/experiments">← All experiments</a>
    </p>
    <h1>{props.experiment.title}</h1>
    <p class="lede">{props.experiment.summary}</p>
    <p class="pattern">⚡ Cloudflare pattern: {props.experiment.pattern}</p>
    {props.children}
  </>
)
