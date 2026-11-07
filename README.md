# dsh-token-quota
A DeepSeek Harness plugin for checking remaining token usage (developed with DSH).

DSH 插件：左侧栏入口 + 左下角头像区上方的悬浮 Token 余量卡片。

## 基本信息
- 1.协议：使用MPL 2.0 (Mozilla Public License 2.0);  
- 2.作者：[B站主页](https://space.bilibili.com/481736023)
          [小红书](https://www.xiaohongshu.com/user/profile/6258defb0000000010006221)
          [Github](https://github.com/Bili481736023)
          [GitCode/AtomGit](https://gitcode.com/2601_96127424)

## 功能

- **悬浮小卡片**（`shell.overlay`，固定于左下角头像区上方）：显示当前余额（CNY）、
  可用 tokens 估算、当前是高峰还是空闲时段、下次切换倒计时，以及当前时段的
  每百万 tokens 输入/输出价格。点击卡片打开详情页。
- **左侧栏入口**（`sidebar.panellist`）：一个图标按钮，打开详情页（`main` 面板）。
- **详情页**：账户余额明细（充值 / 赠送）、可用 tokens 估算、当前计费时段与下次切换、
  两个模型的完整峰谷价格表、数据来源说明与手动刷新。

余额来自 Host 的 `ctx.deepseekAccount.getBalance()`（DeepSeek 平台账户接口），
只经本插件的同源路由 `/dsh-token-quota/state` 提供给页面，浏览器不会拿到凭据。

## 计费时段规则

默认按 DeepSeek 官方 2026-08-17 起生效的峰谷定价：

- **高峰时段**：北京时间周一至周五（不含中国法定节假日）09:00–12:00、14:00–18:00。
- **空闲时段**：其余全部时段，含周末与中国法定节假日全天。
- **空闲价格为高峰价格的一半。**

默认价格（CNY / 百万 tokens，缓存命中输入 / 未命中输入 / 输出）：

| 模型 | 高峰 | 空闲 |
| --- | --- | --- |
| `deepseek-flash` | 0.04 / 2 / 8 | 0.02 / 1 / 4 |
| `deepseek-v4-pro` | 0.30 / 9 / 27 | 0.15 / 4.5 / 13.5 |

当前使用的模型默认跟随 Host 的默认模型选择（模型名含 `pro` 用 Pro 价格，否则用 Flash 价格），
也可在配置里固定。

## 配置

在 profile 的 `cordis.patch.yml` 中覆盖该行的 `config`（全部可选）：

```yaml
- insert:
    - id: dsh-token-quota
      name: '@local/dsh-token-quota'
      config:
        model: auto                 # auto 或 deepseek-flash / deepseek-v4-pro
        currency: CNY               # 主显示币种：CNY / USD
        timeZoneOffsetMinutes: 480  # 计费时区，北京时间为 480
        peakWindows:                # 高峰窗口，[开始, 结束)
          - ['09:00', '12:00']
          - ['14:00', '18:00']
        holidays:                   # 全天空闲的法定节假日（YYYY-MM-DD）
          - '2026-10-01'
        models:                     # 价格表，可自由增删模型
          - id: deepseek-flash
            label: deepseek-flash
            peak: { cachedInput: 0.04, input: 2, output: 8 }
            idle: { cachedInput: 0.02, input: 1, output: 4 }
        refreshSeconds: 30          # 前端轮询间隔（5–600 秒）
        balanceCacheSeconds: 20     # 余额接口缓存（秒）
        cardBottomPx: 96            # 悬浮卡片距视口底部的距离
```

## 实现要点

- Host（`index.js`）：注册 `/dsh-token-quota/state`（同源校验、GET、`refresh=1` 强制刷新余额缓存），
  计算时段、价格与余额；账户服务、默认模型服务均为可选依赖，缺失时降级显示。
- Client（`client.js`）：只使用 `react` 与三个 Slot，样式仅引用 `--dsw-alias-*` 主题变量，
  文案走 Client `locale` 服务并用内置中英词典；资源在 `apply` 中以 `ctx.effect` 注册并随卸载清理。

## 关于

- 此插件为作者在刚刚下载DSH后制作的  
- 目前版本为1.0.0，项目处于稳定维护状态，暂无激进的功能迭代计划，欢迎提交`Issues`反馈  
- 版权所有 © 2026-2032 Bili481736023 (@Bilibili 爱玩机的学生_Official)
