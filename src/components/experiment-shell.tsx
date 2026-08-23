import type { Child } from 'hono/jsx'
import type { Experiment } from '../experiments/types'
import { Lede, Meta, Pattern } from './ui'

export const ExperimentShell = (props: { experiment: Experiment; children: Child }) => (
  <>
    <Meta>
      <a href="/experiments">← All experiments</a>
    </Meta>
    <h1>{props.experiment.title}</h1>
    <Lede>{props.experiment.summary}</Lede>
    <Pattern>⚡ Cloudflare pattern: {props.experiment.pattern}</Pattern>
    {props.children}
  </>
)
