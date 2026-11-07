/**
 * Host half of `@local/dsh-token-quota`.
 *
 * Serves one same-origin JSON endpoint, `/dsh-token-quota/state`, consumed by the
 * Client half (floating card + sidebar page). The endpoint answers three things:
 *   - the DeepSeek account balance (CNY wallets plus granted bonus wallets),
 *   - the current billing period (peak / idle) with the next transition time,
 *   - the price per million tokens for the resolved model in that period.
 *
 * Everything is derived on the Host: the Client never folds time or prices itself.
 */

const STATE_PATH = '/dsh-token-quota/state'

/** Prices in CNY per 1M tokens, official DeepSeek peak/off-peak schedule (from 2026-08-17). */
const DEFAULT_MODELS = [
  {
    id: 'deepseek-flash',
    label: 'deepseek-flash',
    peak: { cachedInput: 0.04, input: 2, output: 8 },
    idle: { cachedInput: 0.02, input: 1, output: 4 },
  },
  {
    id: 'deepseek-v4-pro',
    label: 'deepseek-v4-pro',
    peak: { cachedInput: 0.3, input: 9, output: 27 },
    idle: { cachedInput: 0.15, input: 4.5, output: 13.5 },
  },
]

/** China statutory holidays of 2026 (all-day off-peak per the price notice). */
const HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-02', '2026-01-03',
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
  '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-09-25', '2026-09-26', '2026-09-27',
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
  '2026-10-06', '2026-10-07',
]

const DEFAULT_CONFIG = {
  /** Wallet currency shown as the headline number. */
  currency: 'CNY',
  /** Minutes east of UTC for the billing schedule (Beijing = 480). */
  timeZoneOffsetMinutes: 480,
  /** Peak windows as [start, end) wall-clock strings in the schedule timezone. */
  peakWindows: [
    ['09:00', '12:00'],
    ['14:00', '18:00'],
  ],
  /** ISO dates treated as all-day off-peak. */
  holidays: HOLIDAYS_2026,
  /** Price table; override in cordis.patch.yml to follow future price changes. */
  models: DEFAULT_MODELS,
  /** `auto` follows the Host default model, or pin one of the model ids. */
  model: 'auto',
  /** Client polling hint (seconds). */
  refreshSeconds: 30,
  /** Balance request cache (seconds) so polling does not hammer the platform. */
  balanceCacheSeconds: 20,
  /** Distance in px between the floating card and the bottom of the viewport. */
  cardBottomPx: 96,
  /** Version reported to the platform account API as the client version. */
  clientVersion: '0.1.0',
}

const MINUTE_MS = 60 * 1000
/** Search horizon for the next period change; covers the longest holiday runs. */
const PERIOD_SCAN_DAYS = 21

/* ------------------------------------------------------------------ config */

function toNumber(value, fallback) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

/** Parse `HH:mm` (or `H:mm`) into minutes of day, or null when invalid. */
function minuteOfDay(text) {
  if (typeof text !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})$/u.exec(text.trim())
  if (match === null) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function normalizePrices(raw) {
  const src = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    cachedInput: Math.max(0, toNumber(src.cachedInput, 0)),
    input: Math.max(0, toNumber(src.input, 0)),
    output: Math.max(0, toNumber(src.output, 0)),
  }
}

function normalizeModel(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : null
  if (id === null) return null
  return {
    id,
    label: typeof raw.label === 'string' && raw.label.length > 0 ? raw.label : id,
    peak: normalizePrices(raw.peak),
    idle: normalizePrices(raw.idle),
  }
}

function normalizeWindow(raw) {
  const pair = Array.isArray(raw) ? raw : null
  const start = pair !== null ? pair[0] : null
  const end = pair !== null ? pair[1] : null
  const startMinutes = minuteOfDay(start)
  const endMinutes = minuteOfDay(end)
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null
  return { start: start.trim(), end: end.trim(), startMinutes, endMinutes }
}

function normalizeConfig(raw) {
  const src = raw !== null && typeof raw === 'object' ? raw : {}
  const models = Array.isArray(src.models) ? src.models.map(normalizeModel).filter((m) => m !== null) : []
  const windows = Array.isArray(src.peakWindows) ? src.peakWindows.map(normalizeWindow).filter((w) => w !== null) : []
  const holidays = Array.isArray(src.holidays)
    ? src.holidays.filter((d) => typeof d === 'string')
    : DEFAULT_CONFIG.holidays
  const currency = typeof src.currency === 'string' && src.currency.length > 0 ? src.currency : DEFAULT_CONFIG.currency
  return {
    currency,
    timeZoneOffsetMinutes: toNumber(src.timeZoneOffsetMinutes, DEFAULT_CONFIG.timeZoneOffsetMinutes),
    windows: windows.length > 0
      ? windows
      : DEFAULT_CONFIG.peakWindows
        .map((pair) => normalizeWindow(pair))
        .filter((w) => w !== null),
    holidays,
    holidaySet: new Set(holidays),
    models: models.length > 0 ? models : DEFAULT_MODELS,
    model: typeof src.model === 'string' && src.model.length > 0 ? src.model : DEFAULT_CONFIG.model,
    refreshSeconds: Math.min(600, Math.max(5, toNumber(src.refreshSeconds, DEFAULT_CONFIG.refreshSeconds))),
    balanceCacheSeconds: Math.min(600, Math.max(0, toNumber(src.balanceCacheSeconds, DEFAULT_CONFIG.balanceCacheSeconds))),
    cardBottomPx: Math.min(600, Math.max(0, toNumber(src.cardBottomPx, DEFAULT_CONFIG.cardBottomPx))),
    clientVersion: typeof src.clientVersion === 'string' && src.clientVersion.length > 0 ? src.clientVersion : DEFAULT_CONFIG.clientVersion,
  }
}

/* ------------------------------------------------------------------ period */

/** Wall-clock parts at a fixed UTC offset (no DST for the default schedule). */
function localParts(ms, offsetMinutes) {
  const date = new Date(ms + offsetMinutes * MINUTE_MS)
  return {
    weekday: date.getUTCDay(),
    minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
    date: `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`,
  }
}

function isPeakAt(ms, cfg) {
  const parts = localParts(ms, cfg.timeZoneOffsetMinutes)
  if (parts.weekday === 0 || parts.weekday === 6) return false
  if (cfg.holidaySet.has(parts.date)) return false
  for (const window of cfg.windows) {
    if (parts.minutes >= window.startMinutes && parts.minutes < window.endMinutes) return true
  }
  return false
}

/**
 * Current billing period plus the first minute at which it flips.
 * @param now - epoch milliseconds.
 * @param cfg - normalized plugin config.
 */
function computePeriod(now, cfg) {
  const peak = isPeakAt(now, cfg)
  const firstBoundary = Math.floor(now / MINUTE_MS) * MINUTE_MS + MINUTE_MS
  const limit = firstBoundary + PERIOD_SCAN_DAYS * 24 * 60 * MINUTE_MS
  let nextChangeAt = null
  for (let t = firstBoundary; t <= limit; t += MINUTE_MS) {
    if (isPeakAt(t, cfg) !== peak) {
      nextChangeAt = t
      break
    }
  }
  return {
    id: peak ? 'peak' : 'idle',
    nextId: nextChangeAt === null ? null : peak ? 'idle' : 'peak',
    nextChangeAt,
  }
}

/* ------------------------------------------------------------------ model */

function readDefaultSelection(ctx) {
  try {
    const service = ctx.get('agentDefaultModel')
    if (service === undefined || service === null || typeof service.currentSelection !== 'function') return null
    const selection = service.currentSelection()
    return selection !== null && typeof selection === 'object' ? selection : null
  } catch {
    return null
  }
}

function modelNameOf(selection) {
  if (selection === null || selection === undefined) return ''
  for (const key of ['model', 'id', 'name']) {
    const value = selection[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return ''
}

function resolveModel(ctx, cfg) {
  if (cfg.model !== 'auto') {
    const pinned = cfg.models.find((m) => m.id === cfg.model)
    if (pinned !== undefined) return { model: pinned, source: 'config', selection: null }
  }
  const selection = readDefaultSelection(ctx)
  const name = modelNameOf(selection).toLowerCase()
  let model = null
  if (name.length > 0) {
    model = cfg.models.find((m) => m.id.toLowerCase() === name)
    if (model === undefined) model = cfg.models.find((m) => name.includes(m.id.toLowerCase()))
    if (model === undefined) model = cfg.models.find((m) => m.id.toLowerCase().includes(name))
    if (model === undefined) {
      model = /pro/u.test(name)
        ? cfg.models.find((m) => /pro/u.test(m.id))
        : /flash/u.test(name)
          ? cfg.models.find((m) => /flash/u.test(m.id))
          : undefined
    }
  }
  return {
    model: model !== undefined ? model : cfg.models[0],
    source: name.length > 0 ? 'default' : 'fallback',
    selection,
  }
}

/* ----------------------------------------------------------------- account */

function messageOf(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

function normalizeWallet(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const currency = raw.currency
  const balance = raw.balance
  if (currency !== 'CNY' && currency !== 'USD') return null
  if (typeof balance !== 'string' && typeof balance !== 'number') return null
  const value = typeof balance === 'number' ? balance : Number(balance)
  if (!Number.isFinite(value)) return null
  return { currency, balance: value, raw: String(balance) }
}

function sumWallets(wallets, currency) {
  let total = 0
  let seen = false
  for (const wallet of wallets) {
    if (wallet.currency !== currency) continue
    total += wallet.balance
    seen = true
  }
  return seen ? Math.round(total * 100) / 100 : null
}

async function fetchAccount(ctx, cfg) {
  const account = ctx.get('deepseekAccount')
  if (account === undefined || account === null || typeof account.getState !== 'function') {
    return { status: 'unavailable' }
  }
  let state
  try {
    state = await account.getState()
  } catch (error) {
    return { status: 'error', message: messageOf(error) }
  }
  const links = state !== null && typeof state === 'object' && state.links !== null && typeof state.links === 'object'
    ? {
        usageUrl: typeof state.links.usageUrl === 'string' ? state.links.usageUrl : null,
        topUpUrl: typeof state.links.topUpUrl === 'string' ? state.links.topUpUrl : null,
      }
    : { usageUrl: null, topUpUrl: null }
  if (state === null || state === undefined || state.status !== 'credential-stored') {
    return { status: 'signed-out', wallets: [], bonusWallets: [], totalCny: null, totalUsd: null, ...links }
  }
  let detail
  try {
    detail = await account.getBalance({
      version: cfg.clientVersion,
      locale: 'zh-CN',
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    })
  } catch (error) {
    return { status: 'error', wallets: [], bonusWallets: [], totalCny: null, totalUsd: null, message: messageOf(error), ...links }
  }
  if (detail === null || detail === undefined) {
    return { status: 'signed-out', wallets: [], bonusWallets: [], totalCny: null, totalUsd: null, ...links }
  }
  if (detail.status !== 'ready') {
    return { status: 'failed', wallets: [], bonusWallets: [], totalCny: null, totalUsd: null, ...links }
  }
  const wallets = Array.isArray(detail.value) ? detail.value.map(normalizeWallet).filter((w) => w !== null) : []
  const bonusWallets = Array.isArray(detail.bonusWallets) ? detail.bonusWallets.map(normalizeWallet).filter((w) => w !== null) : []
  const primary = cfg.currency === 'USD' ? 'USD' : 'CNY'
  return {
    status: 'ok',
    wallets,
    bonusWallets,
    totalCny: sumWallets([...wallets, ...bonusWallets], 'CNY'),
    totalUsd: sumWallets([...wallets, ...bonusWallets], 'USD'),
    total: sumWallets([...wallets, ...bonusWallets], primary),
    ...links,
  }
}

async function readAccount(ctx, cfg, cache, force) {
  const now = Date.now()
  if (force !== true && cache.value !== null && now - cache.at < cfg.balanceCacheSeconds * 1000) {
    return cache.value
  }
  const value = await fetchAccount(ctx, cfg)
  if (value.status === 'ok' || value.status === 'signed-out' || value.status === 'unavailable') {
    cache.value = value
    cache.at = Date.now()
  }
  return value
}

function buildEstimate(account, prices) {
  if (account === null || account === undefined || account.status !== 'ok') return null
  const total = typeof account.total === 'number' ? account.total : null
  if (total === null) return null
  const inputTokens = prices.input > 0 ? (total / prices.input) * 1e6 : null
  const outputTokens = prices.output > 0 ? (total / prices.output) * 1e6 : null
  if (inputTokens === null && outputTokens === null) return null
  return { total, inputTokens, outputTokens, basis: 'current-period-input-price' }
}

/* -------------------------------------------------------------- state build */

async function buildState(ctx, cfg, cache, force) {
  const now = Date.now()
  const period = computePeriod(now, cfg)
  const resolved = resolveModel(ctx, cfg)
  const model = resolved.model
  const current = period.id === 'peak' ? model.peak : model.idle
  const account = await readAccount(ctx, cfg, cache, force)
  return {
    ok: true,
    generatedAt: now,
    ui: { cardBottomPx: cfg.cardBottomPx, refreshSeconds: cfg.refreshSeconds },
    schedule: {
      timeZoneOffsetMinutes: cfg.timeZoneOffsetMinutes,
      peakWindows: cfg.windows.map((w) => ({ start: w.start, end: w.end })),
    },
    period,
    model: {
      id: model.id,
      label: model.label,
      source: resolved.source,
      selection: resolved.selection,
    },
    prices: {
      currency: cfg.currency,
      unit: 'perMillionTokens',
      current,
      peak: model.peak,
      idle: model.idle,
      models: cfg.models.map((m) => ({
        id: m.id,
        label: m.label,
        peak: m.peak,
        idle: m.idle,
        current: m.id === model.id,
      })),
    },
    account,
    estimate: buildEstimate(account, current),
  }
}

/* ------------------------------------------------------------------- route */

function trusted(req) {
  const origin = req.headers !== undefined ? req.headers.origin : undefined
  if (origin === undefined) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(payload)
}

function handleState(req, res, ctx, cfg, cache) {
  if (trusted(req) !== true) {
    sendJson(res, 403, { ok: false, error: 'forbidden' })
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { ok: false, error: 'method not allowed' })
    return
  }
  let force = false
  try {
    const url = new URL(typeof req.url === 'string' ? req.url : STATE_PATH, 'http://localhost')
    force = url.searchParams.get('refresh') === '1'
  } catch {
    force = false
  }
  Promise.resolve()
    .then(() => buildState(ctx, cfg, cache, force))
    .then((payload) => {
      sendJson(res, 200, payload)
    })
    .catch((error) => {
      sendJson(res, 500, { ok: false, error: messageOf(error) })
    })
}

/**
 * Host half entry point: owns the state route for the plugin's lifetime.
 * @param ctx - Host plugin context.
 * @param config - row config from `cordis.patch.yml`.
 */
export function apply(ctx, config) {
  const cfg = normalizeConfig(config)
  const cache = { at: 0, value: null }
  ctx.inject(['webServer'], (scoped) => {
    const webServer = scoped.webServer
    if (webServer === undefined || webServer === null || typeof webServer.register !== 'function') return
    const disposeRoute = webServer.register({
      kind: 'exact',
      path: STATE_PATH,
      handler: (req, res) => {
        handleState(req, res, ctx, cfg, cache)
      },
    })
    scoped.effect(() => disposeRoute, 'dsh-token-quota:state-route')
  })
}
