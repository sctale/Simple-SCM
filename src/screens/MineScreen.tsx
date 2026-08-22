import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, RADIUS, SCM_EVENTS, SHADOW, SHADOW_PRIMARY, SPACING } from '../constants';
import {
  addActionItem, addRisk, deleteActionItem, deleteRisk,
  getActionItems, getRisks, toggleActionItem, updateRiskStatus,
} from '../database/scmDB';
import { exportAllData } from '../utils/exportData';
import { pickAndImportData, type ImportStrategy } from '../utils/importData';
import { pickAndImportCsv, SUPPLIER_CSV_COLUMNS, CATEGORY_CSV_COLUMNS } from '../utils/importCsv';
import { getToday } from '../utils/dateUtils';
import { hapticError, hapticLight, hapticSuccess } from '../utils/haptics';
import Modal from '../components/Modal';
import AiChatModal from '../components/AiChatModal';
import Toast, { type ToastState } from '../components/Toast';
import { AppButton, Card, FieldLabel, SectionHeader } from '../components/ui';
import type { ActionItem, Risk } from '../types';

const APP_VERSION = '0.1.6';

interface Props {
  onOpenAiSettings: () => void;
}

export default function MineScreen({ onOpenAiSettings }: Props) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);

  const [riskModal, setRiskModal] = useState(false);
  const [actionModal, setActionModal] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);

  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const reload = useCallback(async () => {
    try {
      const [rs, acts] = await Promise.all([getRisks(), getActionItems()]);
      setRisks(rs);
      setActions(acts);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    reload();
    const subs = [DeviceEventEmitter.addListener(SCM_EVENTS.DATA_IMPORTED, reload)];
    return () => subs.forEach((s) => s.remove());
  }, [reload]);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  // ===== 风险 =====
  const handleAddRisk = useCallback(async (r: { title: string; probability: number; impact: number; strategy: string }) => {
    if (!r.title.trim()) {
      hapticError();
      showToast('请输入风险描述', 'error');
      return;
    }
    try {
      await addRisk({ ...r, targetType: 'general', targetId: null });
      hapticSuccess();
      showToast('风险已登记');
      setRiskModal(false);
      reload();
    } catch {
      hapticError();
    }
  }, [showToast, reload]);

  const riskLevel = useCallback((p: number, i: number) => {
    const score = p * i;
    if (score >= 16) return { label: '高', color: '#EF5350' };
    if (score >= 9) return { label: '中', color: '#FFB74D' };
    return { label: '低', color: '#26A69A' };
  }, []);

  // ===== 行动项 =====
  const handleAddAction = useCallback(async (a: { title: string; owner: string; dueDate: string | null }) => {
    if (!a.title.trim()) {
      hapticError();
      showToast('请输入任务', 'error');
      return;
    }
    if (a.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(a.dueDate)) {
      hapticError();
      showToast('截止日期格式应为 YYYY-MM-DD', 'error');
      return;
    }
    try {
      await addActionItem(a);
      hapticSuccess();
      showToast('行动项已添加');
      setActionModal(false);
      reload();
    } catch {
      hapticError();
    }
  }, [showToast, reload]);

  const handleToggleAction = useCallback(async (a: ActionItem) => {
    try {
      await toggleActionItem(a.id, !a.done);
      hapticLight();
      reload();
    } catch {
      hapticError();
      showToast('操作失败', 'error');
      reload();
    }
  }, [reload, showToast]);

  const handleDeleteAction = useCallback((a: ActionItem) => {
    Alert.alert('删除行动项', `确定删除「${a.title}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try {
            await deleteActionItem(a.id);
            hapticLight();
            reload();
          } catch {
            hapticError();
            showToast('删除失败', 'error');
          }
        },
      },
    ]);
  }, [reload, showToast]);

  const handleToggleRisk = useCallback(async (r: Risk) => {
    const next = r.status === 'closed' ? 'open' : 'closed';
    try {
      await updateRiskStatus(r.id, next);
      reload();
    } catch {
      hapticError();
      showToast('更新失败', 'error');
    }
  }, [reload, showToast]);

  const handleDeleteRisk = useCallback((r: Risk) => {
    Alert.alert('删除风险', `确定删除「${r.title}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try {
            await deleteRisk(r.id);
            hapticLight();
            reload();
          } catch {
            hapticError();
            showToast('删除失败', 'error');
          }
        },
      },
    ]);
  }, [reload, showToast]);

  // ===== 备份 =====
  const handleExport = useCallback(async () => {
    const r = await exportAllData();
    if (r.success) showToast('数据已导出');
    else if (r.error) showToast(r.error, 'error');
  }, [showToast]);

  const confirmImport = useCallback(() => {
    Alert.alert('导入数据', '选择导入方式', [
      { text: '取消', style: 'cancel' },
      { text: '合并', onPress: () => doImport('merge') },
      { text: '替换', style: 'destructive', onPress: () => doImport('replace') },
    ]);
  }, []);

  const doImport = useCallback(async (strategy: ImportStrategy) => {
    const r = await pickAndImportData(strategy);
    if (r.cancelled) return;
    if (r.success) {
      hapticSuccess();
      showToast('数据已导入');
      reload();
    } else {
      hapticError();
      showToast(r.error ?? '导入失败', 'error');
    }
  }, [showToast, reload]);

  // ===== CSV 导入（供应商 / 品类）=====
  const doImportCsv = useCallback(async (kind: 'supplier' | 'category') => {
    const r = await pickAndImportCsv(kind);
    if (r.cancelled) return;
    if (r.success) {
      hapticSuccess();
      showToast(`已导入 ${r.imported ?? 0} 条${kind === 'supplier' ? '供应商' : '品类'}${(r.skipped ?? 0) > 0 ? `，跳过 ${r.skipped} 条重复/空行` : ''}`);
      DeviceEventEmitter.emit(SCM_EVENTS.DATA_IMPORTED);
    } else {
      hapticError();
      showToast(r.error ?? '导入失败', 'error');
    }
  }, [showToast]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>我的</Text>

        {/* AI 模型 */}
        <SectionHeader icon="🤖" title="AI 模型" />
        <Card>
          <Pressable style={styles.aiAssistantBtn} onPress={() => setAiVisible(true)}>
            <Text style={styles.aiAssistantText}>💬 打开 AI 助手</Text>
          </Pressable>
          <Pressable style={styles.entryRow} onPress={onOpenAiSettings}>
            <Text style={styles.entryText}>管理模型与 API Key</Text>
            <Text style={styles.entryArrow}>›</Text>
          </Pressable>
        </Card>

        {/* 行动项 */}
        <SectionHeader icon="📌" title="行动项" />
        <Card>
          {actions.length === 0 ? (
            <Text style={styles.emptyText}>暂无行动项</Text>
          ) : (
            actions.map((a) => (
              <View key={a.id} style={styles.actionRow}>
                <Pressable
                  style={[styles.checkbox, a.done && styles.checkboxOn]}
                  onPress={() => handleToggleAction(a)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: a.done }}
                >
                  {a.done ? <Text style={styles.checkMark}>✓</Text> : null}
                </Pressable>
                <Text style={[styles.actionTitle, a.done && styles.actionTitleDone]} numberOfLines={1}>{a.title}</Text>
                {a.owner ? <Text style={styles.actionOwner}>{a.owner}</Text> : null}
                <Pressable onPress={() => handleDeleteAction(a)} hitSlop={10}>
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>
            ))
          )}
          <Pressable style={styles.addLink} onPress={() => setActionModal(true)}>
            <Text style={styles.addLinkText}>＋ 添加行动项</Text>
          </Pressable>
        </Card>

        {/* 风险登记册 */}
        <SectionHeader icon="⚠️" title="风险登记册（PMP）" />
        <Card>
          {risks.length === 0 ? (
            <Text style={styles.emptyText}>暂无风险登记</Text>
          ) : (
            risks.map((r) => {
              const lv = riskLevel(r.probability, r.impact);
              return (
                <View key={r.id} style={styles.riskRow}>
                  <View style={[styles.riskBadge, { backgroundColor: `${lv.color}1A` }]}>
                    <Text style={[styles.riskBadgeText, { color: lv.color }]}>{lv.label}</Text>
                  </View>
                  <View style={styles.riskInfo}>
                    <Text style={styles.riskTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={styles.riskSub}>概率 {r.probability} × 影响 {r.impact}{r.strategy ? ` · ${r.strategy}` : ''}</Text>
                  </View>
                  <Pressable
                onPress={() => handleToggleRisk(r)}
                hitSlop={10}
              >
                    <Text style={[styles.riskStatus, r.status === 'closed' && { color: COLORS.income }]}>
                      {r.status === 'closed' ? '已关闭' : '处理中'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteRisk(r)} hitSlop={10}>
                    <Text style={styles.deleteText}>✕</Text>
                  </Pressable>
                </View>
              );
            })
          )}
          <Pressable style={styles.addLink} onPress={() => setRiskModal(true)}>
            <Text style={styles.addLinkText}>＋ 登记风险</Text>
          </Pressable>
        </Card>

        {/* 数据备份 */}
        <SectionHeader icon="💾" title="数据管理" />
        <Card>
          <View style={styles.btnRow}>
            <Pressable style={[styles.backupBtn, { backgroundColor: COLORS.accent }]} onPress={handleExport}>
              <Text style={styles.backupBtnText}>导出 JSON</Text>
            </Pressable>
            <Pressable style={[styles.backupBtn, { backgroundColor: COLORS.bgAlt }]} onPress={confirmImport}>
              <Text style={[styles.backupBtnText, { color: COLORS.text }]}>导入数据</Text>
            </Pressable>
          </View>

          <View style={styles.csvBlock}>
            <Text style={styles.csvLabel}>CSV 导入</Text>
            <View style={styles.btnRow}>
              <Pressable style={styles.csvBtn} onPress={() => doImportCsv('supplier')}>
                <Text style={styles.csvBtnText}>📤 导入供应商</Text>
              </Pressable>
              <Pressable style={styles.csvBtn} onPress={() => doImportCsv('category')}>
                <Text style={styles.csvBtnText}>📤 导入品类</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>供应商表头：{SUPPLIER_CSV_COLUMNS.join('、')}</Text>
            <Text style={styles.hint}>品类表头：{CATEGORY_CSV_COLUMNS.join('、')}</Text>
          </View>

          <Text style={styles.hint}>数据完全保存在本地，可导出 JSON 备份或跨设备导入；CSV 用于批量录入供应商/品类</Text>
        </Card>

        {/* 关于 */}
        <SectionHeader title="关于" />
        <Card>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutName}>随身供应链 Simple-SCM</Text>
            <Text style={styles.aboutVersion}>v{APP_VERSION}</Text>
          </View>
          <Text style={styles.hint}>融合 CPSM（供应管理）与 PMP（项目管理）理念的供应商战略管理工具</Text>
        </Card>
      </ScrollView>

      {/* 风险弹窗 */}
      <RiskModal visible={riskModal} onClose={() => setRiskModal(false)} onSave={handleAddRisk} />
      {/* 行动项弹窗 */}
      <ActionModal visible={actionModal} onClose={() => setActionModal(false)} onSave={handleAddAction} />

      <AiChatModal visible={aiVisible} onClose={() => setAiVisible(false)} />
      <Toast toast={toast} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

function RiskModal({ visible, onClose, onSave }: {
  visible: boolean; onClose: () => void; onSave: (r: { title: string; probability: number; impact: number; strategy: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [strategy, setStrategy] = useState('');
  useEffect(() => { if (visible) { setTitle(''); setProbability(3); setImpact(3); setStrategy(''); } }, [visible]);
  return (
    <Modal visible={visible} title="登记风险" onClose={onClose} height={480}>
      <FieldLabel>风险描述</FieldLabel>
      <TextInput style={styles.fieldInput} placeholder="如 关键原料单一供应商" placeholderTextColor={COLORS.textTertiary} value={title} onChangeText={setTitle} maxLength={100} />
      <FieldLabel>发生概率（1-5）</FieldLabel>
      <ScaleRow value={probability} onChange={setProbability} />
      <FieldLabel>影响程度（1-5）</FieldLabel>
      <ScaleRow value={impact} onChange={setImpact} />
      <FieldLabel>应对策略</FieldLabel>
      <TextInput style={styles.fieldInput} placeholder="如 开发第二供应商 / 安全库存" placeholderTextColor={COLORS.textTertiary} value={strategy} onChangeText={setStrategy} maxLength={100} />
      <AppButton title="登记" onPress={() => onSave({ title, probability, impact, strategy })} />
    </Modal>
  );
}

function ActionModal({ visible, onClose, onSave }: {
  visible: boolean; onClose: () => void; onSave: (a: { title: string; owner: string; dueDate: string | null }) => void;
}) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  useEffect(() => { if (visible) { setTitle(''); setOwner(''); setDueDate(''); } }, [visible]);
  return (
    <Modal visible={visible} title="添加行动项" onClose={onClose}>
      <FieldLabel>任务</FieldLabel>
      <TextInput style={styles.fieldInput} placeholder="如 联系供应商索要报价" placeholderTextColor={COLORS.textTertiary} value={title} onChangeText={setTitle} maxLength={100} />
      <FieldLabel>责任人</FieldLabel>
      <TextInput style={styles.fieldInput} placeholder="姓名（可选）" placeholderTextColor={COLORS.textTertiary} value={owner} onChangeText={setOwner} maxLength={20} />
      <FieldLabel>截止日期（YYYY-MM-DD，可选）</FieldLabel>
      <TextInput style={styles.fieldInput} placeholder={getToday()} placeholderTextColor={COLORS.textTertiary} value={dueDate} onChangeText={setDueDate} maxLength={10} />
      <AppButton title="添加" onPress={() => onSave({ title, owner, dueDate: dueDate || null })} />
    </Modal>
  );
}

function ScaleRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.scaleRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} style={[styles.scaleCell, value === n && styles.scaleCellOn]} onPress={() => onChange(n)}>
          <Text style={[styles.scaleText, value === n && styles.scaleTextOn]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  pageTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  aiAssistantBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', marginBottom: SPACING.xs, ...SHADOW_PRIMARY },
  aiAssistantText: { color: '#FFFFFF', fontSize: FONT_SIZE.md, fontWeight: '700' },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, marginTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  entryText: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '500' },
  entryArrow: { fontSize: FONT_SIZE.xl, color: COLORS.textTertiary },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, paddingVertical: SPACING.xs },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.borderSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkMark: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  actionTitle: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  actionTitleDone: { color: COLORS.textTertiary, textDecorationLine: 'line-through' },
  actionOwner: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  riskBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  riskBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  riskInfo: { flex: 1 },
  riskTitle: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '600' },
  riskSub: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 1 },
  riskStatus: { fontSize: FONT_SIZE.xs, color: COLORS.warning, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: SPACING.sm },
  backupBtn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  backupBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#FFFFFF' },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, lineHeight: 17 },
  csvBlock: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  csvLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600', marginBottom: SPACING.sm },
  csvBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accentLight, borderRadius: RADIUS.md, paddingVertical: 11, gap: 4,
  },
  csvBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.accentDark },
  addLink: { paddingVertical: 6 },
  addLinkText: { fontSize: FONT_SIZE.sm, color: COLORS.accent, fontWeight: '600' },
  deleteText: { fontSize: 13, color: COLORS.textTertiary, padding: 4 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  aboutVersion: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONT_SIZE.md, color: COLORS.text,
  },
  scaleRow: { flexDirection: 'row', gap: SPACING.sm },
  scaleCell: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  scaleCellOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  scaleText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, fontWeight: '700' },
  scaleTextOn: { color: '#FFFFFF' },
});
