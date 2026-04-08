# Design Spec v1

`Design Spec v1` 是 capability UI 的统一视觉基线，当前由 `@opapp/ui-native-primitives` 提供并对外导出。

根规范源以 [D:/code/opappdev/DESIGN.md](D:/code/opappdev/DESIGN.md) 为准；本文件描述 primitives 如何把该规范落成 token 与组件约束。

## 1. Token Baseline

- Color:
  - Light 调色板：`lightPalette`（canonical，含 `errorRed` 语义色）
  - Dark 调色板：`darkPalette`（experience-first，从零设计）
  - High Contrast 调色板：`highContrastPalette`（映射到 Windows HC 系统关键字）
  - 向后兼容别名：`appPalette = lightPalette`
  - tone 语义调色板：`lightTonePalette` / `darkTonePalette`（向后兼容别名 `appTonePalette = lightTonePalette`）
  - 战术规划语义色板：`tacticalSurfacePaletteV1`
- Theme:
  - `ThemeProvider`：通过 `colorScheme` + `density` 属性注入主题上下文
  - `useTheme()` hook：在组件内获取当前 palette / tonePalette / spacing
  - 预构建主题对象：`lightTheme` / `darkTheme`
  - 所有组件已迁移到 `useTheme()` 消费 palette/spacing，不再硬编码 token
- Radius: `appRadius`
  - 默认桌面几何预算：
    - `hero=8`
    - `panel=8`
    - `control=6`
    - `compact=8`
    - `badge=10`
    - `pill=999` 仅保留给显式批准的 metadata capsule 例外，不作为默认控件语言
- Spacing:
  - Standard 密度：`appSpacing`（`xxs`=4 / `xs`=6 / `sm`=8 / `md`=10 / `sm2`=12 / `lg`=14 / `lg2`=16 / `xl`=18 / `xl2`=20 / `xxl`=22）
  - Compact 密度：`appSpacingCompact`（所有值 -2px）
  - 密度映射：`appDensitySpacing` (`standard` / `compact`)
- Typography: `appTypography`（`label` / `labelTight` / `labelTightBold` / `caption` / `captionStrong` / `captionBold` / `captionBody` / `captionTight` / `body` / `bodyStrong` / `bodyTight` / `bodyTightBold` / `subheading` / `sectionTitle` / `title` / `headline`）
- Font Family: `appFontFamily`（Windows: `Segoe UI Variable Text` 单一 family，macOS: `SF Pro Text` 单一 family，其他: system default；不要把 web CSS 逗号分隔 font stack 直接传给 RNW `TextInput`）
- Letter Spacing: `appLetterSpacing`（`tight` / `normal` / `wide` / `wider` / `widest`）

## 2. Interactive States

- 状态集合固定为 `rest / hover / focus-visible / pressed / selected / disabled`（见 `appInteractionStates`）。
- 所有交互组件均已配置 `focusable`；离散动作控件默认采用更接近 `focus-visible` 的焦点语义，避免鼠标点击后长期保留外层焦点框。
- 所有交互组件均已配置 `cursor: 'pointer'`（Windows 桌面光标）。
- `pressed` 仅在 pointer down / 键盘激活瞬间提供即时反馈；不得承担持久 current/selected 语义。
- `focus-visible` 仅用于键盘焦点提示；pointer focus 不复用键盘焦点环。
- `selected/current` 表示当前对象或当前选项，允许在释放后持久保留，但必须与命令按钮和 tab current 语义分开。
- 组件态规范：
  - `ChoiceChip`: `idle/active + pressed + emphasized` 组合态
  - `FilterChip`: `idle/active + pressed`
  - `ActionButton`: `accent/ghost + pressed + disabled`
  - `SelectableRow`: `rest/hover/pressed + selected/current + keyboard-only focus-visible`
  - `StatusBadge`: 非交互组件，仅支持 tone + emphasis + size 变化
  - `SignalPill`: 非交互组件，支持 tone + emphasis + size 变化，用于摘要/标签 rail
  - `TimelineStep`: 非交互组件，支持 tone marker + 顺序正文壳层，用于回合轴/流程步骤
- 默认视觉基线：
  - 命令按钮：动作优先，允许 accent fill，但不承担 current-item 表达。
  - 选项 chip / filter：selected 可使用 accent 语义，但只用于选项选择，不外溢成列表 current-item。
  - SelectableRow：`canvas + border` 起步，hover 提升到 `canvasShade`，selected/current 使用 `panelEmphasis + 2px accent leading indicator`，禁止使用整块 `accentSoft + accent border` 作为通用当前项。
  - Tab / nav current：使用各自的 current indicator，不复用 CTA fill 或列表 current-item 视觉。

## 3. Layout Rules

- 共享容器最大宽度：`appLayout.frameMaxWidth`
- 跨尺寸断点（Windows 先行）：
  - `compact`: `appLayout.breakpoints.compact`
  - `wide`: `appLayout.breakpoints.wide`
- capability 页面必须通过 token 与 primitives 组件消费视觉规则，不在 capability 层新增未归档的视觉语义。
- 顶部导航、toolbar action、context toggle 等桌面控件默认收敛到 `control` 几何家族，不再默认使用软圆 badge/pill 语言。

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
  - 已集中定义在 capability 内的命名 registry 中，而不是散落匿名三元组
  - typography-guard 测试会自动校验 registry 的完整性和引用正确性
- 局部例外由各 capability 自行管理，不在本规范逐项登记；只有满足升级门槛后才提升为全局 token。

## 6. Governance

- Design Spec v1 作为当前 UI 规范基线。
- 规范变更必须先更新 primitives 导出与文档，再落 capability。
