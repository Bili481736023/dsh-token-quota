/**
 * Client half of `@local/dsh-token-quota`.
 *
 * Registers three slots:
 *   - `shell.overlay`     : the small floating card above the sidebar foot (avatar area).
 *   - `sidebar.panellist` : the left sidebar entry icon; the host sidebar owns the button
 *                           and opens the matching `main` panel by id.
 *   - `main`              : the detail page (balance, period, full price table).
 *
 * Data comes from the bundle's Host half over one same-origin route.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-token-quota',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect
    const useRef = React.useRef

    const PLUGIN_NAME = 'dsh-token-quota'
    const PANEL_ID = 'dsh-token-quota'
    const STATE_PATH = '/dsh-token-quota/state'
    const NS = 'dsh-token-quota'
    const CARD_ID = 'dsh-token-quota-card'
    const POLL_MS = 30000
    const PREFS_KEY = 'dsh-token-quota:prefs'
    const DEFAULT_PREFS = { compact: true, width: 228 }
    const MIN_WIDTH = 176
    const MAX_WIDTH = 460

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value))
    }

    function readPrefs() {
      try {
        const raw = localStorage.getItem(PREFS_KEY)
        if (typeof raw !== 'string') return { compact: DEFAULT_PREFS.compact, width: DEFAULT_PREFS.width }
        const parsed = JSON.parse(raw)
        return {
          compact: parsed !== null && typeof parsed === 'object' && typeof parsed.compact === 'boolean'
            ? parsed.compact
            : DEFAULT_PREFS.compact,
          width: parsed !== null && typeof parsed === 'object' && typeof parsed.width === 'number' && Number.isFinite(parsed.width)
            ? clamp(parsed.width, MIN_WIDTH, MAX_WIDTH)
            : DEFAULT_PREFS.width,
        }
      } catch (error) {
        return { compact: DEFAULT_PREFS.compact, width: DEFAULT_PREFS.width }
      }
    }

    function savePrefs(prefs) {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ compact: prefs.compact, width: prefs.width }))
      } catch (error) {
        /* storage is optional */
      }
    }

    /* ------------------------------------------------------------- i18n */

    const DICT = {
      zh: {
        'nav.label': 'Token 余量',
        'card.aria': 'Token 余量卡片：余额、计费时段与价格，点击查看详情',
        'card.switchIn': '{time}后转{period}',
        'card.tokensEstimate': '可用约 {tokens} tokens',
        'card.noEstimate': '余额可折算为输入或输出 tokens',
        'card.cached': '缓存',
        'card.input': '输入',
        'card.output': '输出',
        'card.perMillion': '/百万',
        'card.updated': '更新 {time}',
        'card.expand': '展开详情',
        'card.collapse': '收起为一行',
        'period.peak': '高峰时段',
        'period.idle': '空闲时段',
        'duration.minutes': '{m} 分钟',
        'duration.hours': '{h} 小时 {m} 分',
        'duration.days': '{d} 天 {h} 小时',
        'account.signedOut': '未登录',
        'account.failed': '余额获取失败',
        'account.unavailable': '账户不可用',
        'account.error': '读取失败',
        'account.loading': '读取中…',
        'page.title': 'Token 余量与计费时段',
        'page.subtitle': 'DeepSeek 账户余额（CNY）、可用 tokens 与每百万 tokens 价格',
        'page.refresh': '刷新',
        'page.refreshing': '刷新中…',
        'page.loading': '正在读取账户与价格…',
        'page.noData': '暂无数据',
        'page.balance': '账户余额',
        'page.recharge': '充值余额',
        'page.bonus': '赠送余额',
        'page.total': '合计',
        'page.loginHint': '未登录 DeepSeek 账号，无法读取余额。请在「设置 → 账户」中登录后重试。',
        'page.failedHint': '平台余额接口暂时失败，请稍后刷新。',
        'page.unavailableHint': '当前 Profile 未挂载 DeepSeek 账户服务，无法读取余额。',
        'page.estimate': '可用 tokens 估算',
        'page.estimateInput': '按输入价可处理',
        'page.estimateOutput': '按输出价可输出',
        'page.estimateNote': '按当前时段价格估算余额可兑换的 token 数；实际扣费按输入（含缓存命中）与输出分别计价。',
        'page.period': '计费时段',
        'page.now': '当前',
        'page.nextChange': '下次切换',
        'page.nextChangeAt': '{time} 转为{period}',
        'page.lastUpdate': '最后更新',
        'page.rule': '高峰时段为北京时间周一至周五（不含中国法定节假日）9:00–12:00、14:00–18:00；其余时段（含周末与节假日全天）为空闲时段。空闲价格为高峰价格的一半。',
        'page.prices': '价格（{currency} / 百万 tokens）',
        'page.model': '模型',
        'page.periodCol': '时段',
        'page.cachedInput': '输入·缓存命中',
        'page.inputMiss': '输入·缓存未命中',
        'page.output': '输出',
        'page.currentTag': '当前',
        'page.note': '说明',
        'page.noteBalance': '余额来自 DeepSeek 平台账户接口；赠送余额优先扣减。',
        'page.notePricing': '价格取自插件配置（默认官方 2026-08-17 起生效的峰谷价），可在 cordis.patch.yml 中调整。',
        'page.updated': '更新于 {time}',
        'page.usage': '查看用量',
        'page.retry': '重试',
      },
      en: {
        'nav.label': 'Token balance',
        'card.aria': 'Token balance card: balance, billing period and prices. Click for details.',
        'card.switchIn': 'to {period} in {time}',
        'card.tokensEstimate': '≈ {tokens} tokens available',
        'card.noEstimate': 'Balance convertible into input or output tokens',
        'card.cached': 'cached',
        'card.input': 'input',
        'card.output': 'output',
        'card.perMillion': '/1M',
        'card.updated': 'updated {time}',
        'card.expand': 'Expand details',
        'card.collapse': 'Collapse to one line',
        'period.peak': 'Peak',
        'period.idle': 'Off-peak',
        'duration.minutes': '{m} min',
        'duration.hours': '{h} h {m} min',
        'duration.days': '{d} d {h} h',
        'account.signedOut': 'Signed out',
        'account.failed': 'Balance unavailable',
        'account.unavailable': 'Account unavailable',
        'account.error': 'Request failed',
        'account.loading': 'Loading…',
        'page.title': 'Token balance and billing periods',
        'page.subtitle': 'DeepSeek account balance (CNY), usable tokens, and price per million tokens',
        'page.refresh': 'Refresh',
        'page.refreshing': 'Refreshing…',
        'page.loading': 'Reading account and prices…',
        'page.noData': 'No data',
        'page.balance': 'Account balance',
        'page.recharge': 'Recharge wallet',
        'page.bonus': 'Bonus wallet',
        'page.total': 'Total',
        'page.loginHint': 'Not signed in to a DeepSeek account. Sign in from Settings → Account, then retry.',
        'page.failedHint': 'The platform balance endpoint failed. Try refreshing later.',
        'page.unavailableHint': 'This profile has no DeepSeek account service mounted, so the balance cannot be read.',
        'page.estimate': 'Usable token estimate',
        'page.estimateInput': 'Processable at input price',
        'page.estimateOutput': 'Producible at output price',
        'page.estimateNote': 'The balance is converted at the current period prices; real billing prices input (including cached hits) and output separately.',
        'page.period': 'Billing period',
        'page.now': 'Now',
        'page.nextChange': 'Next change',
        'page.nextChangeAt': '{time} → {period}',
        'page.lastUpdate': 'Last update',
        'page.rule': 'Peak hours are 09:00–12:00 and 14:00–18:00 Beijing time, Monday to Friday except Chinese statutory holidays. All other times — including weekends and holidays — are off-peak. Off-peak prices are half the peak prices.',
        'page.prices': 'Prices ({currency} per 1M tokens)',
        'page.model': 'Model',
        'page.periodCol': 'Period',
        'page.cachedInput': 'Input · cache hit',
        'page.inputMiss': 'Input · cache miss',
        'page.output': 'Output',
        'page.currentTag': 'current',
        'page.note': 'Notes',
        'page.noteBalance': 'Balance comes from the DeepSeek Platform account API; bonus balance is deducted first.',
        'page.notePricing': 'Prices come from this plugin’s config (defaults: official peak/off-peak prices effective 2026-08-17) and can be tuned in cordis.patch.yml.',
        'page.updated': 'Updated {time}',
        'page.usage': 'Open usage',
        'page.retry': 'Retry',
      },
    }

    function currentLanguage(ctx) {
      try {
        const locale = ctx.get('locale')
        if (locale === undefined || locale === null) return 'zh'
        const read = typeof locale.getLocale === 'function'
          ? locale.getLocale
          : typeof locale.getSnapshot === 'function'
            ? locale.getSnapshot
            : null
        if (read === null) return 'zh'
        const snapshot = read.call(locale)
        if (snapshot === null || typeof snapshot !== 'object') return 'zh'
        const candidates = [snapshot.id, snapshot.locale, snapshot.preference, snapshot.language]
        for (const value of candidates) {
          if (typeof value === 'string' && value.length > 0) {
            return value.toLowerCase().startsWith('zh') ? 'zh' : 'en'
          }
        }
        return 'zh'
      } catch (error) {
        return 'zh'
      }
    }

    function createTranslate(ctx) {
      try {
        const locale = ctx.get('locale')
        if (locale !== undefined && locale !== null && typeof locale.register === 'function') {
          for (const id of Object.keys(DICT)) {
            try {
              locale.register(NS, id, DICT[id])
            } catch (error) {
              /* dictionary registration is best-effort */
            }
          }
        }
      } catch (error) {
        /* locale service is optional */
      }
      return (key, vars) => {
        const language = currentLanguage(ctx)
        const dict = DICT[language] || DICT.zh
        const template = typeof dict[key] === 'string'
          ? dict[key]
          : typeof DICT.zh[key] === 'string'
            ? DICT.zh[key]
            : key
        if (vars === undefined || vars === null) return template
        return template.replace(/\{(\w+)\}/gu, (match, name) => (Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match))
      }
    }

    function useLocaleVersion(ctx) {
      const [, bump] = useState(0)
      useEffect(() => {
        let dispose
        try {
          const locale = ctx.get('locale')
          if (locale !== undefined && locale !== null && typeof locale.subscribe === 'function') {
            dispose = locale.subscribe(() => bump((value) => value + 1))
          }
        } catch (error) {
          dispose = undefined
        }
        return () => {
          if (typeof dispose === 'function') dispose()
        }
      }, [ctx])
    }

    /* ------------------------------------------------------------ store */

    function createStore() {
      const listeners = new Set()
      let snapshot = { phase: 'loading', data: null, error: null, updatedAt: 0 }
      let inFlight = null
      let timer = null

      function notify() {
        for (const listener of Array.from(listeners)) {
          try {
            listener()
          } catch (error) {
            console.error('[dsh-token-quota] store listener failed', error)
          }
        }
      }

      function load(force) {
        if (inFlight !== null) return inFlight
        inFlight = (async () => {
          try {
            const url = STATE_PATH + (force === true ? '?refresh=1' : '')
            const response = await fetch(url, { cache: 'no-store' })
            if (!response.ok) throw new Error('HTTP ' + response.status)
            const data = await response.json()
            if (data === null || typeof data !== 'object' || data.ok !== true) {
              throw new Error(data !== null && typeof data.error === 'string' ? data.error : 'invalid payload')
            }
            snapshot = { phase: 'ready', data, error: null, updatedAt: Date.now() }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            snapshot = {
              phase: snapshot.data === null ? 'error' : 'stale',
              data: snapshot.data,
              error: message,
              updatedAt: snapshot.updatedAt,
            }
          } finally {
            inFlight = null
            notify()
          }
        })()
        return inFlight
      }

      function tick() {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
        load(false)
      }

      function start() {
        if (timer !== null) return
        load(false)
        timer = setInterval(tick, POLL_MS)
      }

      function stop() {
        if (timer === null) return
        clearInterval(timer)
        timer = null
      }

      return {
        get() {
          return snapshot
        },
        subscribe(listener) {
          listeners.add(listener)
          start()
          return () => {
            listeners.delete(listener)
            if (listeners.size === 0) stop()
          }
        },
        refresh() {
          return load(true)
        },
        dispose() {
          stop()
          listeners.clear()
        },
      }
    }

    function useStore(store) {
      const [, bump] = useState(0)
      useEffect(() => {
        const dispose = store.subscribe(() => bump((value) => value + 1))
        return () => {
          dispose()
        }
      }, [store])
      return store.get()
    }

    /* ------------------------------------------------------- formatting */

    function pad2(value) {
      return String(value).padStart(2, '0')
    }

    function formatMoney(value, currency) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      const symbol = currency === 'USD' ? '$' : '¥'
      return symbol + value.toFixed(2)
    }

    function formatPrice(value) {
      return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—'
    }

    function formatTokens(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—'
      if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B'
      if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M'
      if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K'
      return String(Math.round(value))
    }

    function formatDuration(ms, t) {
      const totalMinutes = Math.max(0, Math.round(ms / 60000))
      const days = Math.floor(totalMinutes / 1440)
      const hours = Math.floor((totalMinutes % 1440) / 60)
      const minutes = totalMinutes % 60
      if (days > 0) return t('duration.days', { d: days, h: hours })
      if (hours > 0) return t('duration.hours', { h: hours, m: minutes })
      return t('duration.minutes', { m: minutes })
    }

    function formatClock(ms, offsetMinutes) {
      const offset = typeof offsetMinutes === 'number' ? offsetMinutes : 480
      const date = new Date(ms + offset * 60000)
      return pad2(date.getUTCHours()) + ':' + pad2(date.getUTCMinutes())
    }

    /* ------------------------------------------------------------- css */

    const CSS = `
.dtq-float {
  position: fixed;
  left: 12px;
  z-index: 70;
  width: 228px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.28));
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  color: var(--dsw-alias-label-primary, #1f2329);
  font-size: 12px;
  line-height: 1.45;
  text-align: left;
  pointer-events: auto;
  cursor: pointer;
  transition: box-shadow 0.16s ease;
}
.dtq-float:hover { box-shadow: 0 10px 30px rgba(15, 23, 42, 0.26); }
.dtq-float:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe); outline-offset: 2px; }
.dtq-head { display: flex; align-items: center; gap: 6px; }
.dtq-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.dtq-dot--peak { background: var(--dsw-alias-state-warn-primary, #f0a020); box-shadow: 0 0 0 3px rgba(240, 160, 32, 0.16); }
.dtq-dot--idle { background: var(--dsw-alias-state-success-primary, #19a15f); box-shadow: 0 0 0 3px rgba(25, 161, 95, 0.16); }
.dtq-period { font-weight: 600; }
.dtq-period--peak { color: var(--dsw-alias-state-warn-primary, #f0a020); }
.dtq-period--idle { color: var(--dsw-alias-state-success-primary, #19a15f); }
.dtq-head-right { margin-left: auto; font-size: 11px; color: var(--dsw-alias-label-secondary, #61666d); white-space: nowrap; }
.dtq-balance { display: flex; align-items: baseline; gap: 5px; margin-top: 2px; }
.dtq-amount { font-size: 21px; font-weight: 650; letter-spacing: -0.01em; }
.dtq-unit { font-size: 11px; color: var(--dsw-alias-label-secondary, #61666d); }
.dtq-tokens { color: var(--dsw-alias-label-secondary, #61666d); }
.dtq-prices { display: flex; flex-wrap: wrap; gap: 2px 8px; font-size: 11px; color: var(--dsw-alias-label-secondary, #61666d); }
.dtq-price { white-space: nowrap; }
.dtq-price b { font-weight: 600; color: var(--dsw-alias-label-primary, #1f2329); }
.dtq-foot { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 10.5px; color: var(--dsw-alias-label-secondary, #61666d); opacity: 0.85; }
.dtq-foot-model { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 104px; }
.dtq-foot-updated { margin-left: auto; white-space: nowrap; }
.dtq-page { height: 100%; width: 100%; box-sizing: border-box; overflow: auto; color: var(--dsw-alias-label-primary, #1f2329); }
.dtq-page-inner { max-width: 900px; margin: 0 auto; padding: 28px 32px 56px; display: flex; flex-direction: column; gap: 16px; }
.dtq-page-head { display: flex; align-items: flex-start; gap: 16px; }
.dtq-page-title { margin: 0; font-size: 20px; font-weight: 650; letter-spacing: -0.01em; }
.dtq-page-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--dsw-alias-label-secondary, #61666d); }
.dtq-btn {
  appearance: none; margin-left: auto; flex: none;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.4));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, #1f2329);
  border-radius: 8px; padding: 6px 12px; font: inherit; font-size: 12.5px; cursor: pointer;
}
.dtq-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.12)); }
.dtq-btn:disabled { opacity: 0.55; cursor: default; }
.dtq-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe); outline-offset: 2px; }
.dtq-panel {
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.28));
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1, transparent);
  padding: 16px 18px;
}
.dtq-panel-title { margin: 0 0 10px; font-size: 13px; font-weight: 600; }
.dtq-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px 18px; }
.dtq-kv { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dtq-kv-label { font-size: 11.5px; color: var(--dsw-alias-label-secondary, #61666d); }
.dtq-kv-value { font-size: 15px; font-weight: 600; }
.dtq-kv-value--big { font-size: 22px; }
.dtq-muted { font-size: 12px; color: var(--dsw-alias-label-secondary, #61666d); margin: 0; line-height: 1.6; }
.dtq-muted + .dtq-muted { margin-top: 6px; }
.dtq-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
.dtq-badge--peak { color: var(--dsw-alias-state-warn-primary, #f0a020); background: rgba(240, 160, 32, 0.12); }
.dtq-badge--idle { color: var(--dsw-alias-state-success-primary, #19a15f); background: rgba(25, 161, 95, 0.12); }
.dtq-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.dtq-table th, .dtq-table td { padding: 8px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.22)); text-align: left; }
.dtq-table th { font-size: 11.5px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666d); white-space: nowrap; }
.dtq-table tr:last-child td { border-bottom: none; }
.dtq-table .dtq-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dtq-row--current { background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.10)); }
.dtq-row--current td:first-child { box-shadow: inset 2px 0 0 var(--dsw-alias-brand-primary, #4d6bfe); }
.dtq-tag { margin-left: 6px; font-size: 10.5px; color: var(--dsw-alias-brand-primary, #4d6bfe); }
.dtq-error { color: var(--dsw-alias-state-error-primary, #d33); font-size: 12.5px; margin: 0; }
.dtq-inline-link { color: var(--dsw-alias-brand-primary, #4d6bfe); text-decoration: none; font-size: 12.5px; }
.dtq-inline-link:hover { text-decoration: underline; }
.dtq-float--compact {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 6px 12px;
  border-radius: 999px;
  white-space: nowrap;
  overflow: hidden;
}
.dtq-float--compact .dtq-amount { font-size: 13px; }
.dtq-token-count { color: var(--dsw-alias-label-secondary, #61666d); font-size: 11px; overflow: hidden; text-overflow: ellipsis; }
.dtq-toggle {
  appearance: none; flex: none;
  border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary, #61666d);
  cursor: pointer; font: inherit; font-size: 12px; line-height: 1;
  padding: 2px 4px; border-radius: 6px;
}
.dtq-toggle:hover { background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.14)); color: var(--dsw-alias-label-primary, #1f2329); }
.dtq-toggle:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe); outline-offset: 1px; }
.dtq-grip {
  position: absolute; right: 2px; bottom: 2px;
  width: 14px; height: 14px;
  display: flex; align-items: flex-end; justify-content: flex-end;
  padding: 2px; cursor: nwse-resize;
  color: var(--dsw-alias-label-secondary, #61666d);
  opacity: 0.65; touch-action: none;
}
.dtq-grip:hover { opacity: 1; }
.dtq-grip::after {
  content: '';
  width: 6px; height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  border-bottom-right-radius: 2px;
}
`

    /* -------------------------------------------------------- components */

    function TokenIcon(props) {
      const size = props !== null && props !== undefined && typeof props.size === 'number' ? props.size : 18
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('rect', { x: 2.6, y: 6.4, width: 18.8, height: 13.2, rx: 3.2, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M2.6 10.2h18.8', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { d: 'M15.7 15.3h2.5', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('circle', { cx: 17.9, cy: 4.8, r: 2.4, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'M17.9 3.6v1.2l0.8 0.6', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })
      )
    }

    function accountLabel(account, phase, t) {
      if (account === null || account === undefined) {
        return phase === 'loading' ? t('account.loading') : t('account.error')
      }
      switch (account.status) {
        case 'ok':
          return null
        case 'signed-out':
          return t('account.signedOut')
        case 'failed':
          return t('account.failed')
        case 'unavailable':
          return t('account.unavailable')
        default:
          return t('account.error')
      }
    }

    function FloatingCard(props) {
      const { store, ctx, t, openPanel } = props
      const snapshot = useStore(store)
      useLocaleVersion(ctx)

      const prefsRef = useRef(null)
      if (prefsRef.current === null) prefsRef.current = readPrefs()
      const [compact, setCompact] = useState(prefsRef.current.compact)
      const [width, setWidth] = useState(prefsRef.current.width)
      const compactRef = useRef(compact)
      const widthRef = useRef(width)
      compactRef.current = compact
      widthRef.current = width

      function toggleCompact(event) {
        event.preventDefault()
        event.stopPropagation()
        const next = compactRef.current !== true
        compactRef.current = next
        setCompact(next)
        savePrefs({ compact: next, width: widthRef.current })
      }

      /** Drag the bottom-right grip to resize the card; the width is remembered in localStorage. */
      function startResize(event) {
        if (typeof event.button === 'number' && event.button !== 0) return
        event.preventDefault()
        event.stopPropagation()
        const startX = event.clientX
        const startWidth = widthRef.current
        let latest = startWidth
        function onMove(moveEvent) {
          latest = clamp(startWidth + (moveEvent.clientX - startX), MIN_WIDTH, MAX_WIDTH)
          setWidth(latest)
        }
        function onEnd() {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onEnd)
          window.removeEventListener('pointercancel', onEnd)
          savePrefs({ compact: compactRef.current, width: latest })
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onEnd)
        window.addEventListener('pointercancel', onEnd)
      }

      const data = snapshot.data
      const period = data !== null && data.period !== null && typeof data.period === 'object' ? data.period : null
      const account = data !== null && data.account !== null && typeof data.account === 'object' ? data.account : null
      const prices = data !== null && data.prices !== null && typeof data.prices === 'object' ? data.prices : null
      const estimate = data !== null && data.estimate !== null && typeof data.estimate === 'object' ? data.estimate : null
      const ui = data !== null && data.ui !== null && typeof data.ui === 'object' ? data.ui : null
      const schedule = data !== null && data.schedule !== null && typeof data.schedule === 'object' ? data.schedule : null

      const periodId = period !== null && period.id === 'peak' ? 'peak' : 'idle'
      const currency = prices !== null && typeof prices.currency === 'string' ? prices.currency : 'CNY'
      const current = prices !== null && prices.current !== null && typeof prices.current === 'object' ? prices.current : null
      const offset = schedule !== null && typeof schedule.timeZoneOffsetMinutes === 'number' ? schedule.timeZoneOffsetMinutes : 480
      const bottom = ui !== null && typeof ui.cardBottomPx === 'number' ? ui.cardBottomPx : 96

      const placeholder = snapshot.phase === 'loading' && data === null
      const accountText = accountLabel(account, snapshot.phase, t)
      const balanceText = placeholder
        ? '…'
        : accountText !== null
          ? accountText
          : formatMoney(account.total, currency)

      let tokensText = ''
      if (account !== null && account.status === 'ok' && estimate !== null) {
        tokensText = typeof estimate.inputTokens === 'number'
          ? t('card.tokensEstimate', { tokens: formatTokens(estimate.inputTokens) })
          : t('card.noEstimate')
      }

      const switchText = period !== null && typeof period.nextChangeAt === 'number'
        ? t('card.switchIn', {
            time: formatDuration(period.nextChangeAt - Date.now(), t),
            period: t(period.nextId === 'peak' ? 'period.peak' : 'period.idle'),
          })
        : ''

      const priceItems = current === null
        ? []
        : [
            { key: 'cached', label: t('card.cached'), value: current.cachedInput },
            { key: 'input', label: t('card.input'), value: current.input },
            { key: 'output', label: t('card.output'), value: current.output },
          ].map((item) => h('span', { key: item.key, className: 'dtq-price' },
            item.label + ' ',
            h('b', null, formatPrice(item.value))
          ))

      const updatedText = snapshot.updatedAt > 0 ? t('card.updated', { time: formatClock(snapshot.updatedAt, offset) }) : ''

      function onKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openPanel()
        }
      }

      if (compact) {
        const compactTokens = estimate !== null && typeof estimate.inputTokens === 'number'
          ? formatTokens(estimate.inputTokens) + ' tokens'
          : ''
        return h('div', {
          className: 'dtq-float dtq-float--compact',
          style: { bottom: bottom + 'px', width: width + 'px' },
          role: 'button',
          tabIndex: 0,
          title: t('card.aria'),
          'aria-label': t('card.aria'),
          onClick: openPanel,
          onKeyDown,
        },
          h('style', { key: 'dtq-style' }, CSS),
          h('span', { className: 'dtq-dot dtq-dot--' + periodId, 'aria-hidden': true }),
          h('span', { className: 'dtq-period dtq-period--' + periodId }, t(periodId === 'peak' ? 'period.peak' : 'period.idle')),
          h('span', { className: 'dtq-amount' }, balanceText),
          accountText === null ? h('span', { className: 'dtq-unit' }, currency) : null,
          compactTokens === '' ? null : h('span', { className: 'dtq-token-count' }, compactTokens),
          h('button', {
            className: 'dtq-toggle',
            type: 'button',
            'aria-label': t('card.expand'),
            title: t('card.expand'),
            'aria-expanded': false,
            onClick: toggleCompact,
          }, '⌄'),
          h('span', { className: 'dtq-grip', 'aria-hidden': true, onPointerDown: startResize })
        )
      }

      return h('div', {
        className: 'dtq-float',
        style: { bottom: bottom + 'px', width: width + 'px' },
        role: 'button',
        tabIndex: 0,
        title: t('card.aria'),
        'aria-label': t('card.aria'),
        onClick: openPanel,
        onKeyDown,
      },
        h('style', { key: 'dtq-style' }, CSS),
        h('div', { className: 'dtq-head' },
          h('span', { className: 'dtq-dot dtq-dot--' + periodId, 'aria-hidden': true }),
          h('span', { className: 'dtq-period dtq-period--' + periodId }, t(periodId === 'peak' ? 'period.peak' : 'period.idle')),
          switchText === '' ? null : h('span', { className: 'dtq-head-right' }, switchText),
          h('button', {
            className: 'dtq-toggle',
            type: 'button',
            'aria-label': t('card.collapse'),
            title: t('card.collapse'),
            'aria-expanded': true,
            onClick: toggleCompact,
          }, '⌃')
        ),
        h('div', { className: 'dtq-balance' },
          h('span', { className: 'dtq-amount' }, balanceText),
          accountText === null ? h('span', { className: 'dtq-unit' }, currency) : null
        ),
        tokensText === '' ? null : h('div', { className: 'dtq-tokens' }, tokensText),
        priceItems.length === 0
          ? null
          : h('div', { className: 'dtq-prices' },
              priceItems,
              h('span', { className: 'dtq-price', key: 'unit' }, t('card.perMillion'))
            ),
        h('div', { className: 'dtq-foot' },
          data !== null && data.model !== null && typeof data.model.label === 'string'
            ? h('span', { className: 'dtq-foot-model', key: 'm' }, data.model.label)
            : null,
          updatedText === '' ? null : h('span', { className: 'dtq-foot-updated', key: 'u' }, updatedText)
        ),
        h('span', { className: 'dtq-grip', 'aria-hidden': true, onPointerDown: startResize })
      )
    }

    function WalletRow(props) {
      const { label, wallets, currency, t } = props
      if (!Array.isArray(wallets) || wallets.length === 0) return null
      const primary = wallets.filter((wallet) => wallet.currency === currency)
      const shown = primary.length > 0 ? primary : wallets
      return h('div', { className: 'dtq-kv' },
        h('span', { className: 'dtq-kv-label' }, label),
        shown.map((wallet, index) => h('span', { className: 'dtq-kv-value', key: index },
          formatMoney(wallet.balance, wallet.currency)
        ))
      )
    }

    function PriceTable(props) {
      const { prices, period, t } = props
      const models = Array.isArray(prices.models) ? prices.models : []
      const currentPeriod = period !== null && period.id === 'peak' ? 'peak' : 'idle'
      const rows = []
      for (const model of models) {
        for (const periodId of ['peak', 'idle']) {
          const cell = model[periodId] !== null && typeof model[periodId] === 'object' ? model[periodId] : {}
          const isCurrent = currentPeriod === periodId && model.current === true
          rows.push(h('tr', { key: model.id + '-' + periodId, className: isCurrent ? 'dtq-row--current' : undefined },
            h('td', null,
              model.label,
              isCurrent ? h('span', { className: 'dtq-tag' }, t('page.currentTag')) : null
            ),
            h('td', null, t(periodId === 'peak' ? 'period.peak' : 'period.idle')),
            h('td', { className: 'dtq-num' }, formatPrice(cell.cachedInput)),
            h('td', { className: 'dtq-num' }, formatPrice(cell.input)),
            h('td', { className: 'dtq-num' }, formatPrice(cell.output))
          ))
        }
      }
      return h('table', { className: 'dtq-table' },
        h('thead', null,
          h('tr', null,
            h('th', null, t('page.model')),
            h('th', null, t('page.periodCol')),
            h('th', { className: 'dtq-num' }, t('page.cachedInput')),
            h('th', { className: 'dtq-num' }, t('page.inputMiss')),
            h('th', { className: 'dtq-num' }, t('page.output'))
          )
        ),
        h('tbody', null, rows)
      )
    }

    function DetailPage(props) {
      const { store, ctx, t } = props
      const snapshot = useStore(store)
      useLocaleVersion(ctx)
      const [busy, setBusy] = useState(false)

      const data = snapshot.data
      const account = data !== null && data.account !== null && typeof data.account === 'object' ? data.account : null
      const prices = data !== null && data.prices !== null && typeof data.prices === 'object' ? data.prices : null
      const period = data !== null && data.period !== null && typeof data.period === 'object' ? data.period : null
      const estimate = data !== null && data.estimate !== null && typeof data.estimate === 'object' ? data.estimate : null
      const schedule = data !== null && data.schedule !== null && typeof data.schedule === 'object' ? data.schedule : null
      const ui = data !== null && data.ui !== null && typeof data.ui === 'object' ? data.ui : null

      const currency = prices !== null && typeof prices.currency === 'string' ? prices.currency : 'CNY'
      const offset = schedule !== null && typeof schedule.timeZoneOffsetMinutes === 'number' ? schedule.timeZoneOffsetMinutes : 480
      const periodId = period !== null && period.id === 'peak' ? 'peak' : 'idle'
      const current = prices !== null && prices.current !== null && typeof prices.current === 'object' ? prices.current : null

      function refresh() {
        if (busy) return
        setBusy(true)
        Promise.resolve(store.refresh()).finally(() => setBusy(false))
      }

      const body = []
      body.push(h('div', { className: 'dtq-page-head', key: 'head' },
        h('div', null,
          h('h1', { className: 'dtq-page-title' }, t('page.title')),
          h('p', { className: 'dtq-page-sub' }, t('page.subtitle'))
        ),
        h('button', { className: 'dtq-btn', type: 'button', onClick: refresh, disabled: busy }, busy ? t('page.refreshing') : t('page.refresh'))
      ))

      if (data === null) {
        body.push(h('div', { className: 'dtq-panel', key: 'empty' },
          h('p', { className: snapshot.phase === 'error' ? 'dtq-error' : 'dtq-muted' },
            snapshot.phase === 'error' ? snapshot.error : t('page.loading')
          )
        ))
      } else {
        body.push(h('div', { className: 'dtq-panel', key: 'balance' },
          h('h2', { className: 'dtq-panel-title' }, t('page.balance')),
          account === null || account.status !== 'ok'
            ? h('p', { className: 'dtq-muted' },
                account !== null && account.status === 'signed-out'
                  ? t('page.loginHint')
                  : account !== null && account.status === 'unavailable'
                    ? t('page.unavailableHint')
                    : t('page.failedHint')
              )
            : h('div', { className: 'dtq-grid' },
                h('div', { className: 'dtq-kv' },
                  h('span', { className: 'dtq-kv-label' }, t('page.total')),
                  h('span', { className: 'dtq-kv-value dtq-kv-value--big' }, formatMoney(account.total, currency))
                ),
                h(WalletRow, { label: t('page.recharge'), wallets: account.wallets, currency, t }),
                h(WalletRow, { label: t('page.bonus'), wallets: account.bonusWallets, currency, t })
              )
        ))

        if (account !== null && account.status === 'ok' && estimate !== null) {
          body.push(h('div', { className: 'dtq-panel', key: 'estimate' },
            h('h2', { className: 'dtq-panel-title' }, t('page.estimate')),
            h('div', { className: 'dtq-grid' },
              h('div', { className: 'dtq-kv' },
                h('span', { className: 'dtq-kv-label' }, t('page.estimateInput')),
                h('span', { className: 'dtq-kv-value' }, formatTokens(estimate.inputTokens) + ' tokens')
              ),
              h('div', { className: 'dtq-kv' },
                h('span', { className: 'dtq-kv-label' }, t('page.estimateOutput')),
                h('span', { className: 'dtq-kv-value' }, formatTokens(estimate.outputTokens) + ' tokens')
              )
            ),
            h('p', { className: 'dtq-muted', style: { marginTop: '12px' } }, t('page.estimateNote'))
          ))
        }

        body.push(h('div', { className: 'dtq-panel', key: 'period' },
          h('h2', { className: 'dtq-panel-title' }, t('page.period')),
          h('div', { className: 'dtq-grid' },
            h('div', { className: 'dtq-kv' },
              h('span', { className: 'dtq-kv-label' }, t('page.now')),
              h('span', null,
                h('span', { className: 'dtq-badge dtq-badge--' + periodId },
                  t(periodId === 'peak' ? 'period.peak' : 'period.idle')
                )
              )
            ),
            period !== null && typeof period.nextChangeAt === 'number'
              ? h('div', { className: 'dtq-kv' },
                  h('span', { className: 'dtq-kv-label' }, t('page.nextChange')),
                  h('span', { className: 'dtq-kv-value' }, t('page.nextChangeAt', {
                    time: formatClock(period.nextChangeAt, offset),
                    period: t(period.nextId === 'peak' ? 'period.peak' : 'period.idle'),
                  }))
                )
              : null,
            h('div', { className: 'dtq-kv' },
              h('span', { className: 'dtq-kv-label' }, t('page.lastUpdate')),
              h('span', { className: 'dtq-kv-value' }, snapshot.updatedAt > 0 ? formatClock(snapshot.updatedAt, offset) : '—')
            )
          ),
          h('p', { className: 'dtq-muted', style: { marginTop: '12px' } }, t('page.rule'))
        ))

        body.push(h('div', { className: 'dtq-panel', key: 'prices' },
          h('h2', { className: 'dtq-panel-title' }, t('page.prices', { currency })),
          h(PriceTable, { prices, period, t })
        ))

        body.push(h('div', { className: 'dtq-panel', key: 'notes' },
          h('h2', { className: 'dtq-panel-title' }, t('page.note')),
          h('p', { className: 'dtq-muted' }, t('page.noteBalance')),
          h('p', { className: 'dtq-muted' }, t('page.notePricing')),
          account !== null && typeof account.usageUrl === 'string'
            ? h('p', { className: 'dtq-muted' },
                h('a', { className: 'dtq-inline-link', href: account.usageUrl, target: '_blank', rel: 'noreferrer noopener' }, t('page.usage'))
              )
            : null
        ))
      }

      if (snapshot.phase === 'error' && snapshot.error !== null) {
        body.push(h('p', { className: 'dtq-error', key: 'err' }, snapshot.error))
      }

      return h('div', { className: 'dtq-page' },
        h('style', { key: 'dtq-style' }, CSS),
        h('div', { className: 'dtq-page-inner' }, body)
      )
    }

    /* ------------------------------------------------------------- apply */

    function apply(ctx) {
      const t = createTranslate(ctx)
      const store = createStore()
      ctx.effect(() => () => store.dispose(), 'dsh-token-quota:store')

      function openPanel() {
        try {
          const layout = ctx.get('layout')
          if (layout === undefined || layout === null || typeof layout.selectPanel !== 'function') return
          layout.selectPanel(PANEL_ID)
        } catch (error) {
          console.error('[dsh-token-quota] open panel failed', error)
        }
      }

      const slots = ctx.get('slots')
      if (slots === undefined || slots === null || typeof slots.inject !== 'function') {
        console.error('[dsh-token-quota] slots service unavailable')
        return
      }

      function CardEntry() {
        return h(FloatingCard, { store, ctx, t, openPanel })
      }

      function PageEntry() {
        return h(DetailPage, { store, ctx, t })
      }

      ctx.effect(() => slots.inject('shell.overlay', () => slots.register({
        name: 'shell.overlay',
        id: CARD_ID,
        order: 100,
      }, CardEntry)), 'dsh-token-quota:card')

      ctx.effect(() => slots.inject('sidebar.panellist', () => slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        label: () => t('nav.label'),
      }, TokenIcon)), 'dsh-token-quota:nav')

      ctx.effect(() => slots.inject('main', () => slots.register({
        name: 'main',
        key: PANEL_ID,
      }, PageEntry)), 'dsh-token-quota:page')
    }

    return {
      name: PLUGIN_NAME,
      inject: ['slots'],
      apply,
    }
  },
})
