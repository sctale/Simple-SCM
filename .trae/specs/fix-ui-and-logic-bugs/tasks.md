# Tasks

> 所有任务均为缺陷修复，按模块划分、相互独立（文件不重叠），可并行执行。除 Task 11 外无依赖。

- [x] Task 1: 修复 Kraljic 矩阵象限错位（src/components/KraljicMatrix.tsx）
  - [x] 交换 `quads` 数组：左上改为 `leverage`、右下改为 `bottleneck`（strategic 右上、routine 左下不变），同步修正第 23 行注释
  - [x] 品类落点热区 Circle 增加 `accessible`、`accessibilityLabel`（品类名 + 象限名）；注：react-native-svg 原生类型不支持 accessibilityRole，已按库能力保留 accessible + accessibilityLabel
  - [x] 自查：风险 5/影响 2 的品类落点应位于右下"瓶颈型"象限，与 `getKraljicQuadrant` 及列表徽章一致

- [x] Task 2: 修复 Android 返回键退出应用（App.tsx）
  - [x] 增加 `BackHandler.addEventListener('hardwareBackPress', ...)`：`subPage !== null` 时 `setSubPage(null)` 并 `return true`，否则 `return false`；effect 依赖 `[subPage]` 并在清理函数中移除监听
  - [x] 自查：AI 设置页按返回键回主界面；主页面返回键不拦截

- [x] Task 3: 修复 AI 对话与 AI 客户端（src/components/AiChatModal.tsx + src/utils/aiClient.ts）
  - [x] AiChatModal：模型加载完成后才触发 initialPrompt 自动发送（在模型加载 effect 的 async 末尾、`modelId` 有值时调用 send；模型未配置时保留错误提示路径）；删除独立自动发送 effect 中与加载竞态的逻辑
  - [x] AiChatModal：`send` 改用函数式更新 `setMessages(prev => ...)`；会话重置（清空 messages/input）与首次自动发送统一在模型加载完成后按确定顺序执行，消除旧对话残留与输入框回填
  - [x] AiChatModal：模型列表为空时 `setModelId(null)`
  - [x] aiClient：`askModel` 改为接收完整消息列表（或新增可选 history 参数），多轮对话携带上下文；同步修正 AiChatModal 调用处
  - [x] aiClient：外部 `options.signal` 与内部超时 `controller` 联动（监听外部 signal abort 并转发到 controller，fetch 始终用 `controller.signal`）
  - [x] aiClient：错误分类——超时（`controller.signal.aborted` 且非外部取消）报"请求超时"；`resp.json()` 解析失败单独捕获报"响应格式错误"
  - [x] 自查：首次打开自动发送成功；关闭重开后会话干净；追问带上历史消息

- [x] Task 4: 修复 AI 设置页（src/screens/AiSettingsScreen.tsx）
  - [x] `handleSaveKey`：`keyText.trim()` 为空时 `hapticError()` + error toast 并 return，不写入空字符串
  - [x] `handleSaveKey`、`handleDeleteModel` 补 try/catch + 失败 toast；`handleAddCustom` 的 catch 补充错误 toast
  - [x] 自查：空 Key 无法保存；模拟保存失败（如临时抛错）有提示

- [x] Task 5: 修复数据库完整性（src/database/scmDB.ts）
  - [x] `deleteSupplier`：改为 `withTransactionAsync`，一并清理 `research_entries.supplier_id`（置 NULL）、`insights(target_type='supplier', target_id=id)`、`risks(target_type='supplier', target_id=id)`
  - [x] `deleteCategory`：事务内补充 `UPDATE research_entries SET category_id = NULL WHERE category_id = ?` 及 `insights/risks(target_type='category')` 的清理
  - [x] `importBackup` merge 模式：先插入 categories（两遍法：先插全部并记录 旧id→新id 映射，再按映射 UPDATE parent_id），再插入 suppliers（category_id 按映射重写），最后插入 insights/researchEntries/risks（supplier/category 类型的 target_id/supplier_id/category_id 按映射重写）
  - [x] `importBackup` merge 模式去重：suppliers/categories 按名称；insights/researchEntries/risks/actionItems 按（内容关键字段 + created_at）；research_templates 去重条件改为 name + questions
  - [x] `importBackup` replace 模式：DELETE 列表补充 `DELETE FROM app_settings;`
  - [x] 自查：merge 导入两次同一备份数据不翻倍、关联指向正确；replace 后多余设置键被清除
  - [x] 附加：导出 `runInTransaction` 事务辅助函数供 CSV 导入使用

- [x] Task 6: 修复 CSV 导入链路（src/utils/csv.ts + src/utils/importCsv.ts + src/utils/importData.ts）
  - [x] csv.ts：仅当当前字段为空（字段起始）时 `"` 才进入引号模式，否则按字面字符追加
  - [x] importCsv.ts：`findColIndexByKeyword` 表头匹配改为小写化比较（`h.toLowerCase().includes(k)`）
  - [x] importCsv.ts：Kraljic 坐标解析改为 `parseFloat` 后再 clamp（"4.5"→4，floor 语义），不再先 `replace(/[^\d]/g,'')`
  - [x] importCsv.ts：导入循环包进 `runInTransaction`，失败整体回滚
  - [x] importData.ts：移除对 `asset.name` 以 `.json` 结尾的前置检查（空文件名误拒），依赖 JSON 解析结果判断
  - [x] 自查：英文表头 CSV 可导入；`5" x 3` 备注不错列；小数坐标不被破坏

- [x] Task 7: 修复基础 UI 组件（src/components/Toast.tsx + Modal.tsx + ui.tsx）
  - [x] Toast：`.start(({ finished }) => { if (finished) onHide(); })`；隐藏分支补 `translateY.setValue(12)`；effect 依赖补 `toast.type`
  - [x] Modal：body 增加 `paddingBottom: insets.bottom`
  - [x] ui.tsx Chip：非激活态 `borderColor: COLORS.border`；补 `accessibilityRole="button"` 与 `accessibilityState` 选中态
  - [x] 自查：连续两条 toast 第二条完整显示；第二次 toast 有滑入动画；Chip 边框可见

- [x] Task 8: 修复各屏幕交互逻辑（HomeScreen / MineScreen / ResearchScreen / SupplierScreen）
  - [x] HomeScreen `handleDeleteInsight`：补 `Alert.alert` 二次确认（与其他实体删除一致）
  - [x] MineScreen `handleToggleAction`：补 try/catch + 失败 toast（参照 `handleToggleRisk` 模式）
  - [x] MineScreen ActionModal：dueDate 保存前校验 `/^\d{4}-\d{2}-\d{2}$/`（允许留空），非法时错误提示不入库
  - [x] ResearchScreen 星级：`Math.max(0, Math.min(5, e.rating ?? 0))` 钳位，防越界崩溃
  - [x] SupplierScreen SupplierDetailModal 数据加载：补 try/catch，失败置空列表渲染干净空态，不抛 unhandled rejection
  - [x] 自查：各场景按 spec Scenario 走查

- [x] Task 9: 修复相对时间计算（src/utils/dateUtils.ts）
  - [x] `relativeTime`："昨天"按日历日判定（比较记录日期与 `now - 1 天` 的日历日），新增"前天"分支
  - [x] 自查：周一 01:00 查看周六 02:00 的记录不显示"昨天"

- [x] Task 10: 修复 getResearchEntries 双参数语义（src/database/scmDB.ts）
  - [x] supplierId 与 categoryId 同时传入时按 `WHERE supplier_id = ? AND category_id = ?` 过滤（现有单参调用行为不变）

- [x] Task 11: 全量验证
  - [x] 运行 `npx tsc --noEmit` 确认零类型错误
  - [x] 按 checklist.md 逐项核对所有修复点（独立验证 agent 核对 36 项：33 通过，3 项遗漏已补修）
  - [x] 全局搜索确认无遗留 unhandled async 操作（本次涉及的 handler 均有 catch）
  - [x] 补修验证发现的 3 处遗漏：① scmDB merge 分支 ai_models 按 name 去重（重复导入模型翻倍）；② importCsv `clamp01to5` 改 Math.floor（"4.5"→4 符合验收标准）；③ KraljicMatrix 落点无障碍按 react-native-svg 库能力保留 accessible + accessibilityRole 类型不支持已移除（tsc 报错），checklist 措辞已如实修订

# Task Dependencies
- Task 11 依赖 Task 1-10 全部完成
- Task 1-10 相互独立（Task 5 与 Task 10 均改 scmDB.ts，已合并为同一 sub-agent 执行）
