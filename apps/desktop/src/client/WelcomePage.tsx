/** Desktop welcome presentation; credential operations stay in the preload. */
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Toast } from '@deepseek-ai/dsh-client-ui-primitives/src/Toast.tsx'
import type { WelcomeApi } from '../welcome-api.ts'

type Page = 'entry' | 'key'

/**
 * Render the standalone welcome flow using shell-owned operations and localized copy.
 *
 * This product has no account sign-in: models are reached with an API key, and a
 * custom endpoint is configured later in Settings. The account surface was
 * removed, so no path here can reach an OAuth flow.
 * @param props.api - isolated preload API; no credentials reach the renderer.
 * @returns welcome pages with fixed bottom actions.
 */
export function Welcome({ api }: { api: WelcomeApi }) {
  const { messages: m } = api
  const [expiryNotice, setExpiryNotice] = useState(false)
  // Opens on API-key entry: the only way in.
  const [page, setPage] = useState<Page>('key')
  const pageRef = useRef<Page>('entry')
  const visiblePage = useRef<Page>('entry')
  const [draft, setDraft] = useState('')
  const [protocol, setProtocol] = useState('openai-completions')
  const [baseUrl, setBaseUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [fullUrl, setFullUrl] = useState(false)
  const [contextWindow, setContextWindow] = useState('')
  const [maxTokens, setMaxTokens] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [models, setModels] = useState<readonly string[]>([])
  const [selected, setSelected] = useState<readonly string[]>([])
  const [probing, setProbing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const input = useRef<HTMLInputElement>(null)
  const keyButton = useRef<HTMLButtonElement>(null)
  const focusEntry = useRef(false)

  function navigate(next: Page) {
    pageRef.current = next
    setPage(next)
  }

  useEffect(() => {
    mounted.current = true
    document.documentElement.lang = api.id
    document.title = m.welcomeTitle
    const takeNotice = (): void => {
      void api.takeNotice().then((notice) => {
        if (mounted.current && notice === 'session-expired') setExpiryNotice(true)
      }).catch((_closedChannel: unknown) => {
        // A closed Welcome IPC channel must not interrupt the welcome page.
      })
    }
    takeNotice()
    // The preload still publishes account state; nothing here reacts to it,
    // but the subscription stays so the channel keeps a live listener.
    const stop = api.onAccountState(() => { takeNotice() })
    return () => { mounted.current = false; stop() }
  }, [api, m.welcomeTitle])

  useEffect(() => {
    if (page === 'entry' && visiblePage.current !== 'entry') void api.analytics?.('auth_page_view', {})
    visiblePage.current = page
    if (page === 'key') input.current?.focus()
    else if (page === 'entry' && focusEntry.current) {
      focusEntry.current = false
      keyButton.current?.focus()
    }
  }, [page, api])

  async function probe(): Promise<void> {
    if (probing) return
    const key = draft.trim()
    if (!/^[\x21-\x7e]+$/.test(key)) {
      setError(key === '' ? m.welcomeKeyBlank : m.welcomeKeyInvalid)
      input.current?.focus()
      return
    }
    setProbing(true)
    setError('')
    try {
      const result = await api.probeModels({ apiKey: key, baseURL: baseUrl.trim() === '' ? undefined : baseUrl.trim() })
      if (!mounted.current) return
      if (!result.ok) setError(m.welcomeModelsFailed)
      else {
        setModels(result.models)
        setSelected(result.models)
        if (result.models.length === 0) setError(m.welcomeModelsEmpty)
      }
    } catch {
      if (mounted.current) setError(m.welcomeModelsFailed)
    } finally {
      if (mounted.current) setProbing(false)
    }
  }

  function reset(): void {
    setDraft(''); setBaseUrl(''); setDisplayName('')
    setModels([]); setSelected([]); setContextWindow(''); setMaxTokens('')
    setProtocol('openai-completions'); setFullUrl(false); setError('')
  }

  async function saveKey(event: FormEvent) {
    event.preventDefault()
    if (busyRef.current) return
    void api.analytics?.('api_key_save_click', {})
    const value = draft.trim()
    if (!/^[\x21-\x7e]+$/.test(value) || /^[A-Z][A-Z0-9_]*=[^=]/.test(value)
      || ((value.startsWith('"') || value.startsWith("'") || value.charCodeAt(0) === 96) && value.at(-1) === value[0])) {
      setError(value === '' ? m.welcomeKeyBlank : m.welcomeKeyInvalid)
      input.current?.focus()
      return
    }
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api.saveApiKey({
        apiKey: value,
        baseURL: baseUrl.trim() === '' ? undefined : baseUrl.trim(),
        api: protocol,
        displayName: displayName.trim() === '' ? undefined : displayName.trim(),
        models: selected.length > 0
          ? selected.map((id) => {
            const entry: { id: string; contextWindow?: number; maxTokens?: number } = { id }
            if (contextWindow.trim() !== '' && Number.isFinite(Number(contextWindow))) entry.contextWindow = Number(contextWindow)
            if (maxTokens.trim() !== '' && Number.isFinite(Number(maxTokens))) entry.maxTokens = Number(maxTokens)
            return entry
          })
          : undefined,
      })
      if (!mounted.current) return
      if (result.ok) setDraft('')
      else setError(m.welcomeKeyFailed)
    } catch {
      if (mounted.current) setError(m.welcomeKeyFailed)
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }
  async function skip() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await api.skip()
      if (mounted.current) setDraft('')
    } catch {
      if (mounted.current) setError(m.welcomeContinueFailed)
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const heading = page === 'entry' ? 'welcome-heading' : 'key-title'

  return <>
    {expiryNotice && <Toast text={m.welcomeSessionExpired} onDone={() => { setExpiryNotice(false) }} />}
    <div className="titlebar" aria-hidden="true" />
    <main className="welcome" aria-labelledby={heading}>
      <img className="brand" src="assets/welcome-brand.svg" alt={m.welcomeBrand} width="472" height="40" />
      <div id="tagline" className="tagline" hidden={page !== 'entry'}>
        <h1 id="welcome-heading"><span>{m.welcomeTaglineBefore}</span><em>{m.welcomeTaglineBrand}</em><span>{m.welcomeTaglineAfter}</span></h1>
        <p id="welcome-description">{m.welcomeDescription}</p>
      </div>
      <form id="key-form" className="key-form" hidden={page !== 'key'} noValidate onSubmit={(event) => { void saveKey(event) }} aria-busy={busy}>
        <header className="key-heading"><h1 id="key-title">{m.welcomeKeyTitle}</h1><p id="key-description">{m.welcomeKeyDescription}</p></header>
        <div className="key-field">
          <label className="field-label" htmlFor="protocol-select">{m.welcomeProtocolLabel}</label>
          <select id="protocol-select" className="protocol-select" value={protocol} disabled={busy}
            onChange={(event) => { setProtocol(event.target.value) }}>
            <option value="openai-completions">{m.welcomeProtocolOpenAiCompletions}</option>
            <option value="openai-responses">{m.welcomeProtocolOpenAiResponses}</option>
            <option value="anthropic-messages">{m.welcomeProtocolAnthropic}</option>
          </select>

          <div className="field-label-row">
            <label className="field-label" htmlFor="base-url-input">{m.welcomeBaseUrlLabel}</label>
            <label className="toggle-inline">
              <input type="checkbox" checked={fullUrl} disabled={busy} onChange={(event) => { setFullUrl(event.target.checked) }} />
              <span>{m.welcomeFullUrlLabel}</span>
            </label>
          </div>
          <input id="base-url-input" type="url" inputMode="url" autoComplete="off" autoCapitalize="off" spellCheck={false}
            placeholder={fullUrl ? m.welcomeFullUrlPlaceholder : m.welcomeBaseUrlPlaceholder}
            value={baseUrl} disabled={busy} onChange={(event) => { setBaseUrl(event.target.value); setError('') }} />

          <label className="field-label" htmlFor="key-input">{m.welcomeKeyPlaceholder}</label>
          <input ref={input} id="key-input" type="password" autoComplete="new-password" autoCapitalize="off" spellCheck={false}
            aria-describedby="key-description key-error" aria-invalid={error !== ''} placeholder={m.welcomeKeyPlaceholder}
            value={draft} disabled={busy} onChange={(event) => { setDraft(event.target.value); setError('') }} />

          <button type="button" className="advanced-toggle" aria-expanded={advanced}
            onClick={() => { setAdvanced(value => !value) }}>
            <span>{m.welcomeAdvancedLabel}</span>
            <span className={advanced ? 'chevron open' : 'chevron'} aria-hidden="true">›</span>
          </button>
          {advanced && (
            <div className="advanced-fields">
              <label className="field-label" htmlFor="display-name-input">{m.welcomeDisplayNameLabel}</label>
              <input id="display-name-input" type="text" autoComplete="off" spellCheck={false}
                placeholder={m.welcomeDisplayNamePlaceholder}
                value={displayName} disabled={busy} onChange={(event) => { setDisplayName(event.target.value) }} />
              <label className="field-label" htmlFor="ctx-input">{m.welcomeContextWindowLabel}</label>
              <input id="ctx-input" type="number" min={1} inputMode="numeric" placeholder={m.welcomeContextWindowPlaceholder}
                value={contextWindow} disabled={busy} onChange={(event) => { setContextWindow(event.target.value) }} />
              <label className="field-label" htmlFor="max-tokens-input">{m.welcomeMaxTokensLabel}</label>
              <input id="max-tokens-input" type="number" min={1} inputMode="numeric" placeholder={m.welcomeMaxTokensPlaceholder}
                value={maxTokens} disabled={busy} onChange={(event) => { setMaxTokens(event.target.value) }} />
            </div>
          )}

          <button id="probe-models" className="probe-button" type="button" disabled={busy || probing} onClick={() => { void probe() }}>
            {probing ? m.welcomeModelsLoading : m.welcomeModelsFetch}
          </button>

          {models.length > 0 && (
            <fieldset className="model-picker" aria-label={m.welcomeModelsLabel}>
              {models.map((id) => {
                const checked = selected.includes(id)
                return (
                  <label key={id} className="model-option">
                    <input type="checkbox" checked={checked} disabled={busy} onChange={() => {
                      setSelected(current => checked ? current.filter(item => item !== id) : [...current, id])
                    }} />
                    <span>{id}</span>
                  </label>
                )
              })}
            </fieldset>
          )}

          <p id="key-error" className="key-error" role="alert" hidden={error === ''}>{error}</p>
        </div>
      </form>
      <div id="entry-actions" className="actions" hidden={page !== 'entry'}>
        <button ref={keyButton} id="api-key" className="primary" type="button" onClick={() => { void api.analytics?.('auth_page_click', { button_name: 'api-key' }); navigate('key') }}>{m.welcomeApiKey}</button>
      </div>
      <div id="key-actions" className="actions" hidden={page !== 'key'}>
        <button id="save-key" className="primary" type="submit" form="key-form" disabled={busy || draft.trim() === ''}>{m.welcomeKeySave}</button>
        <button id="reset-key" className="secondary" type="button" disabled={busy} onClick={reset}>{m.welcomeReset}</button>
        <button id="skip-key" className="secondary" type="button" disabled={busy} onClick={() => { void skip() }}>{m.welcomeKeyLater}</button>
      </div>
    </main>
  </>
}
