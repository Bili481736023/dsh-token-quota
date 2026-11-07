# dsh-token-quota
A DeepSeek Harness plugin for checking remaining token usage (developed with DSH).

DSH Plugin: Sidebar entry + floating Token balance card above the bottom-left avatar area.

## Basic Information
- **License**: [MPL 2.0 (Mozilla Public License 2.0)](https://opensource.org/licenses/MPL-2.0)
- **Author**: Bili481736023 (爱玩机的学生_Official)
  - [Bilibili](https://space.bilibili.com/481736023)
  - [Xiaohongshu](https://www.xiaohongshu.com/user/profile/6258defb0000000010006221)
  - [GitHub](https://github.com/Bili481736023)
  - [GitCode / AtomGit](https://gitcode.com/2601_96127424)

## Features

- **Floating card** (`shell.overlay`, fixed above the bottom-left avatar area): Displays current balance (CNY), estimated available tokens, current peak or off-peak period, countdown to the next switch, and input/output prices per million tokens for the current period. Click the card to open the details page.
- **Sidebar entry** (`sidebar.panellist`): An icon button that opens the details page (`main` panel).
- **Details page**: Account balance breakdown (recharge / bonus), estimated available tokens, current billing period and next switch, complete peak/off-peak price table for both models, data source notes, and manual refresh.

The balance comes from the Host's `ctx.deepseekAccount.getBalance()` (DeepSeek Platform account API) and is only provided to the page via this plugin's same-origin route `/dsh-token-quota/state`. The browser never receives credentials.

## Billing Period Rules

By default, the peak/off-peak pricing effective from August 17, 2026, officially by DeepSeek is used:

- **Peak hours**: Beijing Time, Monday to Friday (excluding Chinese statutory holidays), 09:00–12:00 and 14:00–18:00.
- **Off-peak hours**: All other times, including weekends and Chinese statutory holidays (all day).
- **Off-peak prices are half of the peak prices.**

Default prices (CNY per million tokens, cached input / uncached input / output):

| Model | Peak | Off-peak |
| --- | --- | --- |
| `deepseek-flash` | 0.04 / 2 / 8 | 0.02 / 1 / 4 |
| `deepseek-v4-pro` | 0.30 / 9 / 27 | 0.15 / 4.5 / 13.5 |

The model currently in use follows the Host's default model selection by default (if the model name contains `pro`, Pro prices are used; otherwise, Flash prices are used), or it can be pinned in the configuration.

## Configuration

Override the `config` of this row in the profile's `cordis.patch.yml` (all optional):

```yaml
- insert:
    - id: dsh-token-quota
      name: '@local/dsh-token-quota'
      config:
        model: auto                 # auto, or deepseek-flash / deepseek-v4-pro
        currency: CNY               # Primary display currency: CNY / USD
        timeZoneOffsetMinutes: 480  # Billing timezone offset, 480 for Beijing Time
        peakWindows:                # Peak windows, [start, end)
          - ['09:00', '12:00']
          - ['14:00', '18:00']
        holidays:                   # Statutory holidays treated as all-day off-peak (YYYY-MM-DD)
          - '2026-10-01'
        models:                     # Price table, models can be freely added or removed
          - id: deepseek-flash
            label: deepseek-flash
            peak: { cachedInput: 0.04, input: 2, output: 8 }
            idle: { cachedInput: 0.02, input: 1, output: 4 }
        refreshSeconds: 30          # Frontend polling interval (5–600 seconds)
        balanceCacheSeconds: 20     # Balance API cache (seconds)
        cardBottomPx: 96            # Distance from the floating card to the bottom of the viewport (px)
```

## Implementation Notes

- **Host (`index.js`)**: Registers `/dsh-token-quota/state` (same-origin check, GET, `refresh=1` forces balance cache refresh), calculates period, prices, and balance. The account service and default model service are both optional dependencies and degrade gracefully if missing.
- **Client (`client.js`)**: Uses only `react` and three Slots. Styles only reference `--dsw-alias-*` theme variables. Text uses the Client `locale` service with built-in Chinese/English dictionaries. Resources are registered in `apply` via `ctx.effect` and cleaned up upon unload.

## About

- This plugin was created by the author shortly after first trying out DSH.
- The current version is 1.0.0. The project is in a stable maintenance state with no aggressive feature iteration plans for now. Issues and feedback are welcome.
- Copyright © 2026-2032 Bili481736023 (爱玩机的学生_Official)
