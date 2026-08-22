# 全面缺陷修复（UI 与业务逻辑）Spec

## Why
对「随身供应链」App（React Native / Expo + SQLite）全量代码审查发现约 25 个真实缺陷，涵盖：业务图表象限标注颠倒（Kraljic 矩阵瓶颈型/杠杆型互换）、Android 返回键在子页面直接退出应用、AI 对话弹窗竞态导致"AI 战略建议/AI 分析"首次打开必然发送失败、备份合并导入存在静默数据损坏（外键指向错误对象、重复导入数据翻倍）、删除操作产生孤儿数据、CSV 解析错列，以及多处交互缺少错误反馈与删除确认。

## What Changes
- **Kraljic 矩阵**：修复 bottleneck 与 leverage 象限背景/标签互相颠倒；落点补充无障碍属性。
- **导航**：App.tsx 增加 Android 返回键处理，AI 设置子页返回键回主界面而非退出应用。
- **AI 对话（AiChatModal + aiClient）**：修复自动发送在模型加载完成前执行的竞态；修复重新打开时旧对话残留/输入框回填的过期闭包；`askModel` 支持多轮上下文；模型列表为空时重置 modelId。
- **AI 设置（AiSettingsScreen）**：拒绝保存空 API Key；保存/删除 Key 与模型补充错误处理与 toast 提示。
- **AI 客户端（aiClient）**：外部 AbortSignal 与内部超时信号联动（外部 signal 不再禁用超时）；区分超时/取消/响应格式错误。
- **数据库完整性（scmDB）**：`deleteSupplier`/`deleteCategory` 级联清理关联数据（调研、洞察、风险）；`importBackup` merge 模式建立旧 ID→新 ID 映射并重写所有外键；merge 模式按内容+createdAt 去重；replace 模式清空 `app_settings`；模板去重改为 name+questions。
- **CSV 导入（csv / importCsv / importData）**：表头关键词匹配不区分大小写；修复非字段起始引号导致的错列；Kraljic 小数值解析改用 parseFloat（"4.5" 不再变成 5）；导入循环包进事务；移除对文件名后缀的误判门禁。
- **基础组件（Toast / Modal / ui）**：Toast 隐藏动画回调检查 `finished` 防止新 toast 被误杀；`translateY` 每次显示前重置；effect 依赖补 `toast.type`；Modal body 增加底部安全区内边距；Chip 非激活态边框改为可见的 `COLORS.border` 并补充无障碍属性。
- **屏幕逻辑**：首页删除洞察增加确认弹窗；MineScreen 行动项切换补 try/catch、截止日期格式校验（YYYY-MM-DD）；ResearchScreen 星级渲染对越界 rating 加保护；SupplierScreen 详情加载补错误处理。
- **日期工具（dateUtils）**：`relativeTime` 的"昨天"改按日历日判定。

**非目标（本次不修复，记录为已知限制）**：
- Ollama 预设使用 `localhost`（真机不可达）——属产品决策（预设地址如何给），保留现状。
- 备份不包含 AI API Key（SecureStore 安全考虑）——属安全权衡，保留现状。

## Impact
- Affected specs: 品类矩阵展示、AI 智能助手、AI 模型设置、数据导入导出与备份恢复、供应商/调研/风险/行动项管理、Toast/Modal/Chip 基础组件、相对时间显示。
- Affected code:
  - `App.tsx`
  - `src/components/KraljicMatrix.tsx`、`src/components/AiChatModal.tsx`、`src/components/Toast.tsx`、`src/components/Modal.tsx`、`src/components/ui.tsx`
  - `src/screens/AiSettingsScreen.tsx`、`src/screens/HomeScreen.tsx`、`src/screens/MineScreen.tsx`、`src/screens/ResearchScreen.tsx`、`src/screens/SupplierScreen.tsx`
  - `src/database/scmDB.ts`
  - `src/utils/aiClient.ts`、`src/utils/csv.ts`、`src/utils/importCsv.ts`、`src/utils/importData.ts`、`src/utils/dateUtils.ts`

## ADDED Requirements

### Requirement: Android 系统返回键处理
App SHALL 在子页面（AI 设置）打开时拦截 Android 硬件返回键/返回手势，返回主界面而不是退出应用。

#### Scenario: 子页面按返回键
- **WHEN** 用户在 AI 设置子页面按 Android 返回键或触发返回手势
- **THEN** 返回主界面（subPage 置空），应用不退出

#### Scenario: 主页面按返回键
- **WHEN** 用户在主界面（无子页面）按返回键
- **THEN** 维持系统默认行为（不拦截）

### Requirement: 危险操作确认与输入校验
- 删除洞察 SHALL 弹出 `Alert.alert` 二次确认，与品类/供应商/调研/风险删除行为一致。
- 行动项截止日期 SHALL 校验 `YYYY-MM-DD` 格式，非法输入给出错误提示且不入库。

#### Scenario: 删除洞察
- **WHEN** 用户点击洞察卡片上的删除按钮并确认
- **THEN** 删除执行；点击取消则不删除

#### Scenario: 输入非法截止日期
- **WHEN** 用户在行动项弹窗输入 `2026/8/22` 或 `下周` 并保存
- **THEN** 显示错误提示，不保存该记录

### Requirement: 操作失败反馈
保存/删除 AI Key、删除 AI 模型、切换行动项完成状态、供应商详情加载关联数据失败时，App SHALL 捕获异常并通过 toast 提示用户，不得出现 unhandled promise rejection 或静默失败。

#### Scenario: 保存 Key 失败
- **WHEN** SecureStore 写入 Key 抛出异常
- **THEN** 显示"保存失败"类 toast，界面状态与实际一致

## MODIFIED Requirements

### Requirement: Kraljic 矩阵象限展示
矩阵坐标系为 X=供应风险（右大）、Y=采购影响（上大）。四象限背景与标签 SHALL 与 `getKraljicQuadrant` 的业务计算一致：左上=杠杆型（低风险高影响）、右上=战略型、左下=常规型、右下=瓶颈型（高风险低影响）。落点颜色所在象限背景与列表徽章 SHALL 一致。

#### Scenario: 瓶颈型品类落点
- **WHEN** 品类风险=5、影响=2（getKraljicQuadrant 判定为 bottleneck）
- **THEN** 落点位于右下象限，背景与标签为"瓶颈型"，与列表徽章一致

#### Scenario: 无障碍
- **WHEN** 屏幕阅读器聚焦品类落点
- **THEN** 落点可被识别为按钮并读出品类名与象限

### Requirement: AI 对话弹窗
- 带 `initialPrompt` 打开时，自动发送 SHALL 在模型列表加载完成且 `modelId` 有值之后执行一次；模型未配置时提示配置而非静默失败。
- 每次 `visible` 变为 true 时 SHALL 重置会话（清空消息与输入框）；发送逻辑 SHALL 使用函数式状态更新，避免过期闭包把旧会话写回。
- 多轮对话 SHALL 将历史消息传给模型（`askModel` 接收完整消息列表）。
- 模型列表为空时 `modelId` SHALL 置为 null。

#### Scenario: 首次自动发送
- **WHEN** 用户首次从品类页点"AI 战略建议"
- **THEN** 模型加载完成后自动发送提示词并收到回复（已配置模型与 Key 时）

#### Scenario: 重新打开弹窗
- **WHEN** 用户关闭弹窗后再次从供应商页点"AI 分析"
- **THEN** 显示全新会话，旧消息不残留，输入框不回填已发送内容

#### Scenario: 多轮上下文
- **WHEN** 用户追问"针对上面说的风险展开"
- **THEN** 模型能基于之前的回复作答（请求包含历史消息）

### Requirement: AI 模型 Key 管理
保存 API Key 时 SHALL 校验非空；空输入 SHALL 被拒绝并提示（或语义化为清除 Key），不得出现"已配置"假徽章 + 请求必然 401 的状态。

#### Scenario: 保存空 Key
- **WHEN** 用户清空输入框后点击保存
- **THEN** 显示错误提示，不写入空字符串

### Requirement: AI 请求超时与错误分类
调用方传入外部 `AbortSignal` 时内部超时 SHALL 仍然生效（两个信号任一触发即中止）。超时 SHALL 抛出可识别的错误信息（如"请求超时"），非 JSON 响应 SHALL 报"响应格式错误"，与网络错误、用户取消可区分。

#### Scenario: 外部 signal + 超时
- **WHEN** 调用方传入 signal 且请求超过内部超时时间
- **THEN** 请求中止并报超时错误

### Requirement: 数据删除级联清理
- 删除供应商 SHALL 在同一事务中清理/置空其关联数据：`research_entries.supplier_id`、`insights(target_type='supplier')`、`risks(target_type='supplier')`。
- 删除品类 SHALL 在同一事务中处理：`suppliers.category_id` 置空、`research_entries.category_id` 置空、`insights/risks(target_type='category')` 处理。

#### Scenario: 删除供应商
- **WHEN** 用户删除一个有关联调研与洞察的供应商
- **THEN** 关联数据被清理，调研列表不再把已删供应商的调研误标为"通用"

### Requirement: 备份恢复（importBackup）
- merge 模式 SHALL 为 categories 与 suppliers 建立"备份旧 ID → 本地新 ID"映射，并据此重写 `categories.parent_id`、`suppliers.category_id`、`insights.target_id`、`research_entries.supplier_id/category_id`、`risks.target_id`（仅 supplier/category 类型目标），杜绝静默指向错误对象。
- merge 模式 SHALL 去重：suppliers/categories 按名称、insights/researchEntries/risks/actionItems 按（内容关键字段 + createdAt）、模板按 name+questions；重复导入同一备份不产生重复数据。
- replace 模式 SHALL 先清空 `app_settings` 再恢复备份设置。

#### Scenario: merge 导入后关联正确
- **WHEN** 备份中供应商 A（旧 id=3）挂品类 X（旧 id=1），本地品类 X 已存在（id=7）
- **THEN** 导入后供应商 A 的 categoryId 指向本地的品类 X（id=7），而非本地 id=3 的其他品类

#### Scenario: 重复导入同一备份
- **WHEN** 用户把同一份备份以 merge 模式导入两次
- **THEN** 数据不翻倍

#### Scenario: replace 恢复
- **WHEN** 本地有备份中不存在的设置键，用户执行替换恢复
- **THEN** 恢复后该键不存在

### Requirement: CSV 解析与导入
- 表头关键词匹配 SHALL 不区分大小写（`Name`/`name` 均命中）。
- 未加引号字段中间出现的引号 SHALL 按字面字符处理，不得进入引号模式导致列错位。
- 品类 Kraljic 坐标 SHALL 用 parseFloat 解析（"4.5" → 4，而非 45 截断为 5）。
- 导入循环 SHALL 包在事务中：中途失败整体回滚，不留半成品数据。

#### Scenario: 英文表头 CSV
- **WHEN** 用户导入表头为 `Name,Phone,Email,Status` 的供应商 CSV
- **THEN** 各列正确识别并导入

#### Scenario: 字段内引号
- **WHEN** 备注列内容为 `5" x 3`（未加引号字段）
- **THEN** 该行各列数量正常，备注内容完整

### Requirement: Toast / Modal / Chip 组件
- Toast 隐藏动画回调 SHALL 检查 `finished`，被新 toast 打断的动画不得触发 onHide；每次显示前 SHALL 重置 `translateY`；effect 依赖包含 `toast.type`。
- Modal 内容区 SHALL 预留底部安全区内边距，底部输入行不被 Home 指示条遮挡。
- Chip 非激活态 SHALL 显示可见边框（`COLORS.border`），并具备 `accessibilityRole="button"` 与选中态。

#### Scenario: 连续 toast
- **WHEN** toast A 淡出期间触发 toast B
- **THEN** toast B 正常显示完整时长，不立即消失

#### Scenario: 二次弹 toast 动画
- **WHEN** 第二次及以后显示 toast
- **THEN** 仍有上滑入场动画

### Requirement: 相对时间显示
`relativeTime` 的"昨天" SHALL 按日历日判定（昨天 00:00 至今天 00:00），而非 24-48 小时窗口。

#### Scenario: 跨日历日
- **WHEN** 现在是周一 01:00，记录创建于周六 02:00
- **THEN** 显示"前天"（或对应天数），而非"昨天"

## REMOVED Requirements
（无——本次全部为缺陷修复与行为修正，不删除任何功能。）
