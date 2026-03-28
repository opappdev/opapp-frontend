# Design Spec v1

`Design Spec v1` 是 capability UI 的统一视觉基线，当前由 `@opapp/ui-native-primitives` 提供并对外导出。

## 1. Token Baseline

- Color:
  - 核心调色板：`appPalette`（含 `errorRed` 语义色）
  - tone 语义调色板：`appTonePalette`
  - 战术规划语义色板：`tacticalSurfacePaletteV1`
- Radius: `appRadius`
- Spacing: `appSpacing`（`xxs`=4 / `xs`=6 / `sm`=8 / `md`=10 / `sm2`=12 / `lg`=14 / `lg2`=16 / `xl`=18 / `xl2`=20 / `xxl`=22）
- Typography: `appTypography`（`label` / `labelTight` / `labelTightBold` / `caption` / `captionStrong` / `captionBold` / `captionBody` / `captionTight` / `body` / `bodyStrong` / `bodyTight` / `bodyTightBold` / `subheading` / `sectionTitle` / `title` / `headline`）
- Letter Spacing: `appLetterSpacing`（`tight` / `normal` / `wide` / `wider` / `widest`）

## 2. Interactive States

- 状态集合固定为 `default / hover / pressed / disabled`（见 `appInteractionStates`）。
- 组件态规范：
  - `ChoiceChip`: `idle/active + pressed + emphasized` 组合态
  - `FilterChip`: `idle/active + pressed`
  - `ActionButton`: `accent/ghost + pressed + disabled`
  - `StatusBadge`: 非交互组件，仅支持 tone + emphasis + size 变化
  - `SignalPill`: 非交互组件，支持 tone + emphasis + size 变化，用于摘要/标签 rail
  - `TimelineStep`: 非交互组件，支持 tone marker + 顺序正文壳层，用于回合轴/流程步骤

## 3. Layout Rules

- 共享容器最大宽度：`appLayout.frameMaxWidth`
- 跨尺寸断点（Windows 先行）：
  - `compact`: `appLayout.breakpoints.compact`
  - `wide`: `appLayout.breakpoints.wide`
- capability 页面必须通过 token 与 primitives 组件消费视觉规则，不在 capability 层新增未归档的视觉语义。

## 4. Capability Usage Contract

- capability 层可以：
  - 组合 primitives 组件形成业务布局
  - 使用 token 做必要的页面结构样式
- capability 层不应：
  - 直接定义新的颜色语义体系（应先提升到 primitives）
  - 在无设计契约记录的情况下扩展组件交互态
  - 保留匿名的 typography 三元组；若必须例外，需集中命名并登记到规范例外清单

## 5. Typography Exceptions

- `appTypography` 只吸收稳定的全局层级，默认门槛至少满足其一：
  - 已在两个以上 capability/页面重复出现
  - 会成为 primitives 组件的长期公共契约
- 若 typography 只服务单一 capability 的展示层级，默认保留为 capability 层局部例外，不继续膨胀全局 token 面。
- 局部例外必须同时满足：
  - 语义范围清晰，能用样式名说明用途
  - 已集中定义在 capability 内，而不是散落匿名三元组
  - 已在规范或 handoff 中登记，便于后续复核是否升级为 token
- `战术规划界面` 当前登记的 typography 例外：
  - `heroHeading` = `32/36/800`：遭遇战 hero 标题
  - `battleTitle` = `28/32/800`：分队战斗卡片标题
  - `turnBoardValue` = `18/22/800`：预计回合数主数值
  - `sectionSummaryValue` = `16/21/800`：章节摘要主数值
  - `priorityTitle` = `14/19/800`：优先行动标题
- `settings` 当前登记的 typography 例外：
  - `footerStatus` = `13/20/600`：设置页页脚保存状态文本

## 6. Governance

- Design Spec v1 作为当前 UI 规范基线。
- 规范变更必须先更新 primitives 导出与文档，再落 capability。
