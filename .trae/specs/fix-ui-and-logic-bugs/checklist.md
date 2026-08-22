# Checklist

## Kraljic 矩阵
- [x] KraljicMatrix.tsx 四象限背景/标签与 getKraljicQuadrant 一致：左上杠杆型、右上战略型、左下常规型、右下瓶颈型
- [x] 落点颜色所在象限与品类列表徽章不再矛盾（风险5/影响2 → 右下瓶颈型）
- [x] 品类落点具备 accessible 与 accessibilityLabel（品类名+象限名）；注：react-native-svg 原生组件不支持 accessibilityRole，属库限制，读屏已可感知落点

## 导航
- [x] AI 设置子页面按 Android 返回键回主界面，不退出应用
- [x] 主界面返回键维持系统默认行为（监听正确移除，无泄漏）

## AI 对话
- [x] 首次从品类/供应商页打开"AI 战略建议/AI 分析"，模型加载后自动发送成功
- [x] 关闭弹窗后再次带 initialPrompt 打开：旧对话不残留、输入框不回填已发送内容
- [x] 多轮对话请求携带历史消息（askModel 接收消息列表）
- [x] 模型列表为空时 modelId 置 null，错误提示准确

## AI 设置
- [x] 空 API Key 无法保存，有错误提示，不出现假"已配置"徽章
- [x] 保存/删除 Key、删除模型、添加自定义模型失败均有 toast，无 unhandled rejection

## AI 客户端
- [x] 传入外部 AbortSignal 时内部超时仍生效（信号联动）
- [x] 超时报"请求超时"、非 JSON 响应报"响应格式错误"，与网络错误可区分

## 数据库完整性
- [x] deleteSupplier 事务清理关联调研/洞察/风险，无孤儿数据
- [x] deleteCategory 事务清理 suppliers、research_entries 及品类洞察/风险
- [x] merge 导入：categories.parent_id / suppliers.category_id / insights.target_id / research_entries 外键 / risks.target_id 均按旧id→新id 映射重写
- [x] merge 导入同一备份两次，数据不翻倍（suppliers/categories/insights/research/risks/actionItems/aiModels/templates/settings 均有去重）
- [x] replace 导入先清空 app_settings
- [x] 模板去重按 name+questions

## CSV 导入
- [x] 英文表头（Name/Phone/Email/Status 等）CSV 可正确识别导入
- [x] 未加引号字段内的引号（如 `5" x 3`）不再引起列错位
- [x] 品类 Kraljic 小数坐标（"4.5"）解析为 4（parseFloat + floor + clamp），不再被破坏
- [x] 导入循环有事务，中途失败整体回滚
- [x] 文件名为空的合法 JSON 备份不再被误拒

## 基础组件
- [x] Toast 淡出期间新 toast 完整显示，不被过期回调杀掉
- [x] 第二次及以后显示 toast 仍有滑入动画（translateY 重置）
- [x] Modal 内容区有底部安全区内边距，输入行不被 Home 指示条遮挡
- [x] Chip 非激活态边框可见（COLORS.border），且有 button 角色与选中态

## 屏幕逻辑
- [x] 首页删除洞察有二次确认弹窗
- [x] 行动项完成状态切换失败有 toast，UI 与数据库一致
- [x] 行动项截止日期非法格式（如 2026/8/22）被拦截并提示
- [x] rating 越界（如导入的 6+）时调研列表星级渲染不崩溃
- [x] 供应商详情关联数据加载失败不再 unhandled rejection

## 日期工具
- [x] relativeTime"昨天"按日历日判定（周一 01:00 查周六 02:00 记录不显示"昨天"）

## 收尾验证
- [x] npx tsc --noEmit 零错误
- [x] 无其他回归：本次修改未引入新问题（逐文件 diff 复查 + 独立验证 agent 全量核对 36 项）
