# Component System v1

本清单定义 capability 页面必须优先复用的组件体系与边界。

## Core Components

1. `AppFrame`
   - 用于 capability 页面的统一头部与内容外框。
   - 禁止用于列表项或局部卡片嵌套容器。
2. `SectionCard`
   - 用于业务分区容器（标题 + 内容组）。
   - 禁止用于可点击行项目或表格单元格。
3. `ChoiceChip`
   - 用于单选/切换决策项。
   - 禁止承担主提交流程 CTA。
4. `ActionButton`
   - 用于执行动作（保存、打开、切换、应用）。
   - 禁止作为纯状态展示标签。
5. `StatusBadge`
   - 用于短文本状态标记（tone/emphasis/size）。
   - 禁止承载长文说明或交互动作。
6. `SignalPill`
   - 用于摘要信号、战术标签、元数据 rail 等上下文提示。
   - 禁止替代 readiness 主状态或任何可点击操作。
7. `TimelineStep`
   - 用于顺序化计划、回合轴、分步说明，包含 marker、标题、说明与可选补充正文。
   - 禁止替代表格行、密集数据列表或主操作区。
8. `FilterChip`
   - 用于筛选维度切换。
   - 禁止替代主操作按钮。

## Disabled Scenarios

- 若需求属于以下场景，默认不新增组件，优先复用现有组件组合：
  - 仅文案变化
  - 仅图层顺序变化
  - 仅颜色/间距微调
- 只有当现有组件无法表达语义且会导致重复分叉实现时，才允许新增组件。

## Capability Constraint

- capability 层只消费组件契约，不扩展视觉语义。
- 新增视觉语义必须先进入 `@opapp/ui-native-primitives`，并更新 `Design Spec v1`。
