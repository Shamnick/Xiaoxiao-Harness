/** Built-in prompt sections, role policies, and transcript projections for orchestrator and worker Sessions. */
import { bundledSkills, promptFile } from './skill-files.ts'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller'
export { textPage } from './cards.ts'

/** Built-in host-delivery and tool-usage rules shared by all Sessions; a team may override them (`builtInParts`). */
export const sharedPrompt = promptFile('shared')
export const masterPrompt = promptFile('orchestrator')
export const workerPrompt = promptFile('worker')
/** Built-in policy sections referenced by role prompts; a team may override them. */
export const guides: Readonly<Record<string, string>> = Object.fromEntries(['subscriptions', 'replies', 'dispatch', 'work']
  .map(name => [name, promptFile(name)]))
/** Bundled Source skills registered by dsh-superagent; a team may override their text. */
export const sourceSkills: Readonly<Record<'feishu' | 'github', string>> = { feishu: bundledSkills.feishu.content, github: bundledSkills.github.content }
export const cliNotes = promptFile('cli')
/** Default text for the team-editable prompt sections (communication, ticket scope, and PR delivery). */
export const teamDefaults = {
  communication: promptFile('team/communication'), scope: promptFile('team/scope'), delivery: promptFile('team/delivery'),
}

export const mainAdmissionPolicy = promptFile('admission')

const handoff = { shared: promptFile('handoff'), orchestrator: promptFile('handoff-orchestrator'), worker: promptFile('handoff-worker') }
export const handoffPolicy = (role: 'orchestrator' | 'worker'): string => `${handoff.shared}\n${handoff[role]}`

export const autoMergeThreshold = (lines: number): string => `it changes fewer than ${lines} lines (additions plus deletions);`

/**
 * Retains message content while omitting streamed chunks, usage accounting, and reasoning blocks.
 *
 * Takes a wire event: the Session API now returns envelopes whose `data` is
 * opaque JSON, so the message fields are narrowed here rather than carried in
 * the type. Only the three message-bearing event names are read.
 */
export function transcriptEntry(event: SessionWireEvent) {
  if (event.type !== 'user/message' && event.type !== 'tool/result' && event.type !== 'assistant/message') return undefined
  const shape = { role: '' as string, content: [] as readonly ContentBlock[] }
  // Wire data is opaque JSON; this narrows it at the one place the shape is known.
  const payload = event.data as unknown as { role: string, content: readonly ContentBlock[], message?: typeof shape }
  const message = event.type === 'user/message' ? payload : payload.message
  if (message === undefined) return undefined
  return { type: event.type, message: { role: message.role, content: message.content.filter(block => block.type !== 'reasoning') } }
}
