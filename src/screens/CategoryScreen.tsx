import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS, FONT_SIZE, RADIUS, SCM_EVENTS, SHADOW, SHADOW_PRIMARY, SPACING, getKraljicQuadrant, getQuadrantDef,
} from '../constants';
import {
  addCategory, deleteCategory, getCategories, getSuppliers, updateCategory,
} from '../database/scmDB';
import { hapticError, hapticLight, hapticSuccess } from '../utils/haptics';
import Modal from '../components/Modal';
import KraljicMatrix from '../components/KraljicMatrix';
import AiChatModal from '../components/AiChatModal';
import Toast, { type ToastState } from '../components/Toast';
import { AppButton, Card, EmptyState, FieldLabel } from '../components/ui';
import type { Category, Supplier } from '../types';

export default function CategoryScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [detail, setDetail] = useState<Category | null>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const reload = useCallback(async () => {
    try {
      const [cat, sup] = await Promise.all([getCategories(), getSuppliers()]);
      setCategories(cat);
      setSuppliers(sup);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    reload();
    const subs = [
      DeviceEventEmitter.addListener(SCM_EVENTS.CATEGORY_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.SUPPLIER_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.DATA_IMPORTED, reload),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [reload]);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const supplierCount = useCallback((catId: number) => suppliers.filter((s) => s.categoryId === catId).length, [suppliers]);

  const handleSave = useCallback(async (data: Partial<Category>) => {
    try {
      if (editing) {
        await updateCategory(editing.id, data);
        showToast('已保存');
      } else {
        await addCategory({
          name: data.name ?? '', parentId: null,
          kraljicX: data.kraljicX ?? 1, kraljicY: data.kraljicY ?? 1,
          strategy: data.strategy ?? '', note: data.note ?? '',
        });
        showToast('品类已创建');
      }
      setFormVisible(false);
      setEditing(null);
      hapticSuccess();
      DeviceEventEmitter.emit(SCM_EVENTS.CATEGORY_CHANGED);
      reload();
    } catch {
      hapticError();
      showToast('保存失败', 'error');
    }
  }, [editing, showToast, reload]);

  const handleDelete = useCallback((c: Category) => {
    Alert.alert('删除品类', `确定删除「${c.name}」？关联供应商将解除品类归属。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(c.id);
            hapticSuccess();
            setDetail(null);
            DeviceEventEmitter.emit(SCM_EVENTS.CATEGORY_CHANGED);
            reload();
          } catch { hapticError(); }
        },
      },
    ]);
  }, [reload]);

  const handleAiStrategy = useCallback((c: Category) => {
    const q = getQuadrantDef(getKraljicQuadrant(c.kraljicX, c.kraljicY));
    setAiPrompt(
      `请为以下采购品类制定战略（结合 Kraljic 矩阵定位与 CPSM 方法论）：\n` +
      `品类：${c.name}\n供应风险：${c.kraljicX}/5\n采购影响：${c.kraljicY}/5\n矩阵定位：${q.label}\n现有战略：${c.strategy || '无'}\n` +
      `请给出：1) 品类定位分析 2) 采购战略建议 3) 供应商管理策略 4) 风险应对`
    );
    setAiVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>品类战略</Text>
        <Pressable style={styles.addBtn} onPress={() => { setEditing(null); setFormVisible(true); }}>
          <Text style={styles.addBtnText}>＋ 新增品类</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Kraljic 矩阵 */}
        <Card>
          <Text style={styles.cardTitle}>Kraljic 品类矩阵</Text>
          <KraljicMatrix categories={categories} onSelect={(c) => setDetail(c)} />
          <View style={styles.legendRow}>
            {['strategic', 'bottleneck', 'leverage', 'routine'].map((q) => {
              const def = getQuadrantDef(q as 'strategic');
              return (
                <View key={q} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: def.color }]} />
                  <Text style={styles.legendText}>{def.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* 品类列表 */}
        {categories.length === 0 ? (
          <EmptyState emoji="🗂️" text="还没有品类，点击右上角创建第一个品类" />
        ) : (
          categories.map((c) => {
            const q = getQuadrantDef(getKraljicQuadrant(c.kraljicX, c.kraljicY));
            return (
              <Pressable key={c.id} style={styles.catCard} onPress={() => setDetail(c)}>
                <View style={styles.catTop}>
                  <Text style={styles.catName}>{c.name}</Text>
                  <View style={[styles.quadBadge, { backgroundColor: `${q.color}1A` }]}>
                    <Text style={[styles.quadBadgeText, { color: q.color }]}>{q.label}</Text>
                  </View>
                </View>
                <View style={styles.catMeta}>
                  <Text style={styles.metaText}>风险 {c.kraljicX}/5 · 影响 {c.kraljicY}/5</Text>
                  <Text style={styles.metaText}>· {supplierCount(c.id)} 家供应商</Text>
                </View>
                {c.strategy ? (
                  <Text style={styles.strategyPreview} numberOfLines={2}>{c.strategy}</Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* 表单 */}
      <CategoryFormModal
        visible={formVisible}
        editing={editing}
        onClose={() => { setFormVisible(false); setEditing(null); }}
        onSave={handleSave}
      />
      {/* 详情 */}
      <CategoryDetailModal
        category={detail}
        suppliers={suppliers}
        onClose={() => setDetail(null)}
        onEdit={(c) => { setDetail(null); setEditing(c); setFormVisible(true); }}
        onDelete={handleDelete}
        onAiStrategy={handleAiStrategy}
      />
      <AiChatModal visible={aiVisible} onClose={() => setAiVisible(false)} initialPrompt={aiPrompt} />
      <Toast toast={toast} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

function CategoryFormModal({ visible, editing, onClose, onSave }: {
  visible: boolean; editing: Category | null; onClose: () => void; onSave: (d: Partial<Category>) => void;
}) {
  const [name, setName] = useState('');
  const [kraljicX, setKraljicX] = useState(1);
  const [kraljicY, setKraljicY] = useState(1);
  const [strategy, setStrategy] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setName(editing?.name ?? '');
      setKraljicX(editing?.kraljicX ?? 1);
      setKraljicY(editing?.kraljicY ?? 1);
      setStrategy(editing?.strategy ?? '');
      setNote(editing?.note ?? '');
    }
  }, [visible, editing]);

  const quadrant = getQuadrantDef(getKraljicQuadrant(kraljicX, kraljicY));

  return (
    <Modal visible={visible} title={editing ? '编辑品类' : '新增品类'} onClose={onClose} height={560}>
      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FieldLabel>品类名称 *</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="如 电子元器件 / 包装材料" placeholderTextColor={COLORS.textTertiary} value={name} onChangeText={setName} maxLength={30} />

        <FieldLabel>供应风险（1-5）</FieldLabel>
        <ScalePicker value={kraljicX} onChange={setKraljicX} />
        <FieldLabel>采购影响（1-5）</FieldLabel>
        <ScalePicker value={kraljicY} onChange={setKraljicY} />

        <View style={[styles.quadPreview, { backgroundColor: `${quadrant.color}14` }]}>
          <Text style={[styles.quadPreviewText, { color: quadrant.color }]}>
            矩阵定位：{quadrant.label}
          </Text>
          <Text style={styles.quadPreviewStrategy}>{quadrant.strategy}</Text>
        </View>

        <FieldLabel>品类战略</FieldLabel>
        <TextInput
          style={[styles.fieldInput, styles.multiline]}
          placeholder="描述该品类的采购战略、目标、行动计划…"
          placeholderTextColor={COLORS.textTertiary}
          value={strategy}
          onChangeText={setStrategy}
          multiline
          maxLength={1000}
        />
        <FieldLabel>备注</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="其他信息（可选）" placeholderTextColor={COLORS.textTertiary} value={note} onChangeText={setNote} maxLength={200} />
      </ScrollView>
      <AppButton title="保存" onPress={() => onSave({ name, kraljicX, kraljicY, strategy, note })} disabled={!name.trim()} />
    </Modal>
  );
}

function ScalePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.scaleRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          style={[styles.scaleCell, value === n && styles.scaleCellOn]}
          onPress={() => onChange(n)}
        >
          <Text style={[styles.scaleText, value === n && styles.scaleTextOn]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CategoryDetailModal({ category, suppliers, onClose, onEdit, onDelete, onAiStrategy }: {
  category: Category | null; suppliers: Supplier[];
  onClose: () => void; onEdit: (c: Category) => void; onDelete: (c: Category) => void;
  onAiStrategy: (c: Category) => void;
}) {
  if (!category) return null;
  const q = getQuadrantDef(getKraljicQuadrant(category.kraljicX, category.kraljicY));
  const related = suppliers.filter((s) => s.categoryId === category.id);

  return (
    <Modal visible={!!category} title={category.name} onClose={onClose} height={620}>
      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.quadPreview, { backgroundColor: `${q.color}14` }]}>
          <Text style={[styles.quadPreviewText, { color: q.color }]}>Kraljic 定位：{q.label}</Text>
          <Text style={styles.quadPreviewStrategy}>{q.strategy}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>供应风险</Text>
          <Text style={styles.detailValue}>{category.kraljicX}/5 · 采购影响 {category.kraljicY}/5</Text>
        </View>

        <Text style={styles.detailSection}>品类战略</Text>
        <View style={styles.strategyBox}>
          <Text style={styles.strategyText}>{category.strategy || '暂无战略，点击下方「AI 战略建议」生成'}</Text>
        </View>

        <View style={styles.detailActions}>
          <Pressable style={[styles.actionBtn, { backgroundColor: COLORS.accent }]} onPress={() => onAiStrategy(category)}>
            <Text style={styles.actionBtnText}>🤖 AI 战略建议</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: COLORS.bgAlt }]} onPress={() => onEdit(category)}>
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>✏️ 编辑</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: '#FCE4EC' }]} onPress={() => onDelete(category)}>
            <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>🗑 删除</Text>
          </Pressable>
        </View>

        <Text style={styles.detailSection}>关联供应商（{related.length}）</Text>
        {related.length === 0 ? (
          <Text style={styles.emptyText}>暂无供应商归入该品类</Text>
        ) : (
          related.map((s) => (
            <View key={s.id} style={styles.subRow}>
              <Text style={styles.subText}>{s.name}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg,
  },
  pageTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: 10, minHeight: 44, justifyContent: 'center', ...SHADOW_PRIMARY },
  addBtnText: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: '700' },
  scroll: { flex: 1, marginTop: SPACING.sm },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  catCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW,
  },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, flex: 1 },
  quadBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  quadBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  catMeta: { flexDirection: 'row', gap: 6, marginTop: SPACING.xs + 2 },
  metaText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  strategyPreview: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xs + 2, lineHeight: 19 },
  // 表单
  formScroll: { flex: 1 },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONT_SIZE.md, color: COLORS.text,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  scaleRow: { flexDirection: 'row', gap: SPACING.sm },
  scaleCell: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  scaleCellOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  scaleText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, fontWeight: '700' },
  scaleTextOn: { color: '#FFFFFF' },
  quadPreview: { borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm },
  quadPreviewText: { fontSize: FONT_SIZE.md, fontWeight: '800' },
  quadPreviewStrategy: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4, lineHeight: 19 },
  // 详情
  detailRow: { flexDirection: 'row', paddingVertical: 6, gap: SPACING.md },
  detailLabel: { width: 70, fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  detailValue: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text },
  detailSection: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  strategyBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  strategyText: { fontSize: FONT_SIZE.md, color: COLORS.text, lineHeight: 22 },
  detailActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, marginBottom: SPACING.sm },
  actionBtn: { flex: 1, minHeight: 44, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: '#FFFFFF' },
  subRow: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm + 2, marginBottom: SPACING.xs,
  },
  subText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
});
