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
   - 几何默认归属 desktop command family，保持紧致圆角，不做 pill CTA。
   - 禁止作为纯状态展示标签。
5. `StatusBadge`
   - 用于短文本状态标记（tone/emphasis/size）。
   - 几何只服务短状态标签，不外溢成通用交互语言。
   - 禁止承载长文说明或交互动作。
6. `SignalPill`
   - 用于摘要信号、战术标签、元数据 rail 等上下文提示。
   - 属于例外型 metadata capsule，而不是默认按钮/导航形态。
   - 禁止替代 readiness 主状态或任何可点击操作。
7. `TimelineStep`
   - 用于顺序化计划、回合轴、分步说明，包含 marker、标题、说明与可选补充正文。
   - 禁止替代表格行、密集数据列表或主操作区。
8. `FilterChip`
   - 用于筛选维度切换。
   - 几何应与 desktop control family 对齐，而非沿用 badge 式软圆。
   - 禁止替代主操作按钮。
9. `FilterSection`
   - 用于承载一组 FilterChip 的横向滚动筛选栏。
   - 禁止用于独立的内容区区或表单分组。
10. `Divider`
    - 用于内容区之间的语义分隔线。
    - 禁止用于装饰性边框或卡片轮廓。
11. `EmptyState`
    - 用于引导性空数据占位，含标题、说明和可选操作。
    - 禁止用于无指导意义的通用"暂无数据"消息。
12. `DataRow`
    - 用于结构化列表行：角色/物品/样式展示，含 badge 集群。
    - 禁止用于自由段落内容或深层嵌套布局。
13. `Expander`
    - 用于可折叠分组标题，支持键盘切换。
    - 禁止用于不可折叠的 section title 或深度嵌套手风琴。
14. `Toolbar`
   - 用于页面级或 section 级横向命令栏。
    - 几何应维持结构性 command rail，避免被做成导航 pill 容器。
    - 禁止用于导航 tab 或行内内容操作。
15. `ProgressBar`
    - 用于 tone-aware 的数值进度指示器。
    - 禁止用于无数值支撑的装饰性填充条。
16. `TextInput`
    - 用于搜索/过滤文本输入，含焦点环和清除操作。
    - 禁止用于多行富文本编辑。
17. `Tooltip`
    - 用于桌面端鼠标悬停信息提示（Windows pointer events）。
    - 禁止用于移动端或常驻展示信息。

## Disabled Scenarios

- 若需求属于以下场景，默认不新增组件，优先复用现有组件组合：
  - 仅文案变化
  - 仅图层顺序变化
  - 仅颜色/间距微调
- 只有当现有组件无法表达语义且会导致重复分叉实现时，才允许新增组件。

## Capability Constraint

- capability 层只消费组件契约，不扩展视觉语义。
- 新增视觉语义必须先进入 `@opapp/ui-native-primitives`，并更新 `Design Spec v1`。
