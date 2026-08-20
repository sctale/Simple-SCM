import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, INSIGHT_TAGS, RADIUS, SCM_EVENTS, SHADOW, SHADOW_PRIMARY, SPACING, getInsightTagDef } from '../constants';
import {
  addInsight, deleteInsight, getActionItems, getCategories, getInsights, getResearchEntries, getSuppliers,
} from '../database/scmDB';
import { relativeTime } from '../utils/dateUtils';
import { hapticError, hapticLight, hapticSuccess } from '../utils/haptics';
import AiChatModal from '../components/AiChatModal';
import Toast, { type ToastState } from '../components/Toast';
import { Card, Chip, EmptyState, SectionHeader } from '../components/ui';
import type { InsightTag } from '../types';

interface Props {
  onGoSupplier: () => void;
  onGoCategory: () => void;
  onGoResearch: () => void;
}

export default function HomeScreen({ onGoSupplier, onGoCategory, onGoResearch }: Props) {
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof getInsights>>>([]);
  const [supplierCount, setSupplierCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [researchCount, setResearchCount] = useState(0);
  const [todos, setTodos] = useState<Awaited<ReturnType<typeof getActionItems>>>([]);
  const [quickText, setQuickText] = useState('');
  const [quickTag, setQuickTag] = useState<InsightTag>('observation');
  const [aiVisible, setAiVisible] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const reload = useCallback(async () => {
    try {
      const [ins, sup, cat, res, acts] = await Promise.all([
        getInsights(), getSuppliers(), getCategories(), getResearchEntries(), getActionItems(),
      ]);
      setInsights(ins.slice(0, 20));
      setSupplierCount(sup.length);
      setCategoryCount(cat.length);
      setResearchCount(res.length);
      setTodos(acts.filter((a) => !a.done).slice(0, 3));
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    reload();
    const subs = [
      DeviceEventEmitter.addListener(SCM_EVENTS.INSIGHT_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.SUPPLIER_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.CATEGORY_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.RESEARCH_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.DATA_IMPORTED, reload),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [reload]);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const handleQuickSave = useCallback(async () => {
    const content = quickText.trim();
    if (!content) {
      hapticError();
      showToast('请输入内容', 'error');
      return;
    }
    try {
      await addInsight({ content, targetType: 'general', targetId: null, tag: quickTag });
      setQuickText('');
      hapticSuccess();
      showToast('已记录 ✨');
      DeviceEventEmitter.emit(SCM_EVENTS.INSIGHT_CHANGED);
      reload();
    } catch {
      hapticError();
      showToast('记录失败', 'error');
    }
  }, [quickText, quickTag, showToast, reload]);

  const handleDeleteInsight = useCallback(async (id: number) => {
    try {
      await deleteInsight(id);
      hapticLight();
      DeviceEventEmitter.emit(SCM_EVENTS.INSIGHT_CHANGED);
      reload();
    } catch {
      hapticError();
    }
  }, [reload]);

  const stats = useMemo(() => [
    { label: '供应商', value: supplierCount, emoji: '🏭', onPress: onGoSupplier },
    { label: '品类', value: categoryCount, emoji: '🗂️', onPress: onGoCategory },
    { label: '调研记录', value: researchCount, emoji: '🔍', onPress: onGoResearch },
  ], [supplierCount, categoryCount, researchCount, onGoSupplier, onGoCategory, onGoResearch]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* 标题 + AI */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>供应链管理</Text>
            <Text style={styles.subtitle}>供应商战略 · 调研 · 洞察</Text>
          </View>
          <Pressable style={styles.aiBtn} onPress={() => setAiVisible(true)}>
            <Text style={styles.aiBtnEmoji}>🤖</Text>
            <Text style={styles.aiBtnText}>AI 助手</Text>
          </Pressable>
        </View>

        {/* 快捷洞察 */}
        <Card>
          <Text style={styles.cardTitle}>💡 快速记录一条洞察</Text>
          <TextInput
            style={styles.quickInput}
            placeholder="输入战略判断 / 风险 / 机会 / 观察…"
            placeholderTextColor={COLORS.textTertiary}
            value={quickText}
            onChangeText={setQuickText}
            multiline
            maxLength={300}
          />
          <View style={styles.quickFooter}>
            <View style={styles.tagRow}>
              {INSIGHT_TAGS.map((t) => (
                <Chip
                  key={t.key}
                  label={t.label}
                  active={quickTag === t.key}
                  color={t.color}
                  onPress={() => { setQuickTag(t.key); hapticLight(); }}
                />
              ))}
            </View>
            <Pressable style={styles.quickSave} onPress={handleQuickSave}>
              <Text style={styles.quickSaveText}>记录</Text>
            </Pressable>
          </View>
        </Card>

        {/* 统计概览 */}
        <View style={styles.statRow}>
          {stats.map((s) => (
            <Pressable key={s.label} style={styles.statCard} onPress={s.onPress}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 待办行动项 */}
        {todos.length > 0 ? (
          <>
            <SectionHeader icon="📌" title="待办行动项" />
            <Card>
              {todos.map((t) => (
                <View key={t.id} style={styles.todoRow}>
                  <Text style={styles.todoDot}>•</Text>
                  <Text style={styles.todoText} numberOfLines={1}>{t.title}</Text>
                  {t.owner ? <Text style={styles.todoOwner}>{t.owner}</Text> : null}
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* 最近洞察 */}
        <SectionHeader icon="🕐" title="最近洞察" />
        {insights.length === 0 ? (
          <Card>
            <EmptyState emoji="💡" text="还没有洞察记录，用上方输入框记录第一条吧" />
          </Card>
        ) : (
          insights.map((ins) => {
            const tag = getInsightTagDef(ins.tag);
            return (
              <View key={ins.id} style={styles.insightRow}>
                <View style={[styles.insightDot, { backgroundColor: tag.color }]} />
                <View style={styles.insightBody}>
                  <Text style={styles.insightText}>{ins.content}</Text>
                  <Text style={styles.insightMeta}>{tag.label} · {relativeTime(ins.createdAt)}</Text>
                </View>
                <Pressable onPress={() => handleDeleteInsight(ins.id)} hitSlop={8}>
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      <AiChatModal visible={aiVisible} onClose={() => setAiVisible(false)} />
      <Toast toast={toast} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pageTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, marginTop: 2 },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    ...SHADOW_PRIMARY,
  },
  aiBtnEmoji: { fontSize: 16 },
  aiBtnText: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: '700' },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  quickInput: {
    backgroundColor: COLORS.bgAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  quickFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quickSave: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
  },
  quickSaveText: { color: '#FFFFFF', fontSize: FONT_SIZE.md, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: 2,
    ...SHADOW,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  todoDot: { color: COLORS.accent, fontSize: FONT_SIZE.md },
  todoText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  todoOwner: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOW,
  },
  insightDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  insightBody: { flex: 1 },
  insightText: { fontSize: FONT_SIZE.md, color: COLORS.text, lineHeight: 21 },
  insightMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 3 },
  deleteText: { fontSize: 12, color: COLORS.textTertiary, padding: 4 },
});
