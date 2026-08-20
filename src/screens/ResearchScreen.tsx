import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS, FONT_SIZE, RADIUS, RESEARCH_TYPES, SCM_EVENTS, SHADOW, SHADOW_PRIMARY, SPACING, getResearchTypeDef,
} from '../constants';
import {
  addResearchEntry, deleteResearchEntry, getCategories, getResearchEntries,
  getResearchTemplates, getSuppliers,
} from '../database/scmDB';
import { relativeTime } from '../utils/dateUtils';
import { hapticError, hapticLight, hapticSuccess } from '../utils/haptics';
import Modal from '../components/Modal';
import Toast, { type ToastState } from '../components/Toast';
import type { Category, ResearchEntry, ResearchTemplate, ResearchType, Supplier } from '../types';

type FilterType = 'all' | ResearchType;

export default function ResearchScreen() {
  const [entries, setEntries] = useState<ResearchEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [formVisible, setFormVisible] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const reload = useCallback(async () => {
    try {
      const [ent, sup, cat] = await Promise.all([getResearchEntries(), getSuppliers(), getCategories()]);
      setEntries(ent);
      setSuppliers(sup);
      setCategories(cat);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    reload();
    const subs = [
      DeviceEventEmitter.addListener(SCM_EVENTS.RESEARCH_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.SUPPLIER_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.CATEGORY_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.DATA_IMPORTED, reload),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [reload]);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const supplierName = useCallback((id: number | null) => {
    if (id == null) return '';
    return suppliers.find((s) => s.id === id)?.name ?? '';
  }, [suppliers]);

  const categoryName = useCallback((id: number | null) => {
    if (id == null) return '';
    return categories.find((c) => c.id === id)?.name ?? '';
  }, [categories]);

  const filtered = useMemo(() => {
    return filter === 'all' ? entries : entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  const handleSave = useCallback(async (data: {
    supplierId: number | null; categoryId: number | null; type: ResearchType;
    question: string; content: string; rating: number | null; conclusion: string;
  }) => {
    try {
      await addResearchEntry(data);
      setFormVisible(false);
      hapticSuccess();
      showToast('调研已记录');
      DeviceEventEmitter.emit(SCM_EVENTS.RESEARCH_CHANGED);
      reload();
    } catch {
      hapticError();
      showToast('记录失败', 'error');
    }
  }, [showToast, reload]);

  const handleDelete = useCallback((e: ResearchEntry) => {
    Alert.alert('删除调研记录', '确定删除这条调研记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try {
            await deleteResearchEntry(e.id);
            hapticLight();
            DeviceEventEmitter.emit(SCM_EVENTS.RESEARCH_CHANGED);
            reload();
          } catch { hapticError(); }
        },
      },
    ]);
  }, [reload]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>供应商调研</Text>
        <Pressable style={styles.addBtn} onPress={() => setFormVisible(true)}>
          <Text style={styles.addBtnText}>＋ 记录调研</Text>
        </Pressable>
      </View>

      {/* 类型筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable style={[styles.filterChip, filter === 'all' && styles.filterChipOn]} onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextOn]}>全部</Text>
        </Pressable>
        {RESEARCH_TYPES.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.filterChip, filter === t.key && styles.filterChipOn]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[styles.filterText, filter === t.key && styles.filterTextOn]}>{t.emoji} {t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>还没有调研记录，点击右上角开始记录</Text>
          </View>
        ) : (
          filtered.map((e) => {
            const t = getResearchTypeDef(e.type);
            const target = supplierName(e.supplierId) || categoryName(e.categoryId) || '通用';
            return (
              <View key={e.id} style={styles.entryCard}>
                <View style={styles.entryTop}>
                  <View style={[styles.typeBadge, { backgroundColor: `${COLORS.accent}1A` }]}>
                    <Text style={[styles.typeBadgeText, { color: COLORS.accent }]}>{t.emoji} {t.label}</Text>
                  </View>
                  <Pressable onPress={() => handleDelete(e)} hitSlop={8}>
                    <Text style={styles.deleteText}>✕</Text>
                  </Pressable>
                </View>
                {e.question ? <Text style={styles.entryQuestion}>{e.question}</Text> : null}
                {e.content ? <Text style={styles.entryContent} numberOfLines={4}>{e.content}</Text> : null}
                <View style={styles.entryMeta}>
                  <Text style={styles.metaText}>{target}</Text>
                  {e.rating != null ? (
                    <Text style={styles.ratingText}>{'★'.repeat(e.rating)}{'☆'.repeat(5 - e.rating)}</Text>
                  ) : null}
                  <Text style={styles.metaText}>· {relativeTime(e.createdAt)}</Text>
                </View>
                {e.conclusion ? (
                  <Text style={styles.entryConclusion}>结论：{e.conclusion}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <ResearchFormModal
        visible={formVisible}
        suppliers={suppliers}
        categories={categories}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
      <Toast toast={toast} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

function ResearchFormModal({ visible, suppliers, categories, onClose, onSave }: {
  visible: boolean; suppliers: Supplier[]; categories: Category[];
  onClose: () => void; onSave: (d: {
    supplierId: number | null; categoryId: number | null; type: ResearchType;
    question: string; content: string; rating: number | null; conclusion: string;
  }) => void;
}) {
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [type, setType] = useState<ResearchType>('quality');
  const [question, setQuestion] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [conclusion, setConclusion] = useState('');
  const [templates, setTemplates] = useState<ResearchTemplate[]>([]);

  useEffect(() => {
    if (visible) {
      setSupplierId(null);
      setCategoryId(null);
      setType('quality');
      setQuestion('');
      setContent('');
      setRating(null);
      setConclusion('');
      getResearchTemplates().then(setTemplates).catch(() => {});
    }
  }, [visible]);

  const applyTemplate = useCallback((tpl: ResearchTemplate) => {
    try {
      const qs = JSON.parse(tpl.questions) as string[];
      setQuestion(qs.join('\n'));
      hapticLight();
    } catch {
      // 静默
    }
  }, []);

  return (
    <Modal visible={visible} title="记录调研" onClose={onClose} height={640}>
      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>调研类型</Text>
        <View style={styles.chipWrap}>
          {RESEARCH_TYPES.map((t) => (
            <Pressable
              key={t.key}
              style={[styles.pickChip, type === t.key && styles.pickChipOn]}
              onPress={() => setType(t.key)}
            >
              <Text style={[styles.pickChipText, type === t.key && styles.pickChipTextOn]}>{t.emoji} {t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>关联供应商</Text>
        <View style={styles.chipWrap}>
          {suppliers.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.pickChip, supplierId === s.id && styles.pickChipOn]}
              onPress={() => setSupplierId(supplierId === s.id ? null : s.id)}
            >
              <Text style={[styles.pickChipText, supplierId === s.id && styles.pickChipTextOn]}>{s.name}</Text>
            </Pressable>
          ))}
          {suppliers.length === 0 ? <Text style={styles.emptyText}>暂无供应商</Text> : null}
        </View>

        <Text style={styles.fieldLabel}>关联品类</Text>
        <View style={styles.chipWrap}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.pickChip, categoryId === c.id && styles.pickChipOn]}
              onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
            >
              <Text style={[styles.pickChipText, categoryId === c.id && styles.pickChipTextOn]}>{c.name}</Text>
            </Pressable>
          ))}
          {categories.length === 0 ? <Text style={styles.emptyText}>暂无品类</Text> : null}
        </View>

        {/* 模板 */}
        <Text style={styles.fieldLabel}>调研模板（点击填入问题）</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tplRow}>
          {templates.map((tpl) => (
            <Pressable key={tpl.id} style={styles.tplChip} onPress={() => applyTemplate(tpl)}>
              <Text style={styles.tplChipText}>📋 {tpl.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.fieldLabel}>调研问题</Text>
        <TextInput
          style={[styles.fieldInput, styles.multiline]}
          placeholder="要调研的问题（可用模板快速填入）"
          placeholderTextColor={COLORS.textTertiary}
          value={question}
          onChangeText={setQuestion}
          multiline
          maxLength={1000}
        />
        <Text style={styles.fieldLabel}>调研记录 / 发现</Text>
        <TextInput
          style={[styles.fieldInput, styles.multiline]}
          placeholder="访谈纪要、现场观察、数据…"
          placeholderTextColor={COLORS.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={2000}
        />
        <Text style={styles.fieldLabel}>评分（1-5）</Text>
        <View style={styles.scaleRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} style={[styles.starCell, rating === n && styles.starCellOn]} onPress={() => setRating(rating === n ? null : n)}>
              <Text style={[styles.starText, rating != null && n <= rating && styles.starTextOn]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>结论</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="调研结论（可选）"
          placeholderTextColor={COLORS.textTertiary}
          value={conclusion}
          onChangeText={setConclusion}
          maxLength={500}
        />
      </ScrollView>
      <Pressable
        style={[styles.saveBtn, (!question.trim() && !content.trim()) && styles.saveBtnDisabled]}
        onPress={() => onSave({ supplierId, categoryId, type, question, content, rating, conclusion })}
        disabled={!question.trim() && !content.trim()}
      >
        <Text style={styles.saveBtnText}>保存记录</Text>
      </Pressable>
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
  filterRow: { gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },
  filterTextOn: { color: '#FFFFFF' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyEmoji: { fontSize: 40, opacity: 0.5 },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  entryCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs + 2 },
  typeBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  typeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  deleteText: { fontSize: 13, color: COLORS.textTertiary, padding: 4 },
  entryQuestion: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, lineHeight: 21, marginBottom: 4 },
  entryContent: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.xs + 2 },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  ratingText: { fontSize: FONT_SIZE.xs, color: '#FFB74D', letterSpacing: 1 },
  entryConclusion: {
    fontSize: FONT_SIZE.sm, color: COLORS.accentDark, backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm, lineHeight: 19,
  },
  // 表单
  formScroll: { flex: 1 },
  fieldLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, fontWeight: '600', marginTop: SPACING.sm, marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONT_SIZE.md, color: COLORS.text,
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pickChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  pickChipOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  pickChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },
  pickChipTextOn: { color: '#FFFFFF' },
  tplRow: { gap: SPACING.sm, paddingVertical: 2 },
  tplChip: {
    backgroundColor: COLORS.accentLight, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md, paddingVertical: 7,
  },
  tplChipText: { fontSize: FONT_SIZE.sm, color: COLORS.accentDark, fontWeight: '600' },
  scaleRow: { flexDirection: 'row', gap: SPACING.sm },
  starCell: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  starCellOn: { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' },
  starText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, fontWeight: '700' },
  starTextOn: { color: '#E65100' },
  saveBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: 13, alignItems: 'center', marginTop: SPACING.md, ...SHADOW_PRIMARY },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#FFFFFF', fontSize: FONT_SIZE.md, fontWeight: '700' },
});
