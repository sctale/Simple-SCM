import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS, FONT_SIZE, RADIUS, SCM_EVENTS, SHADOW, SHADOW_PRIMARY, SPACING, SUPPLIER_GRADES, SUPPLIER_STATUSES,
  getGradeDef, getStatusDef,
} from '../constants';
import {
  addSupplier, deleteSupplier, getCategories, getInsights, getResearchEntries,
  getSuppliers, updateSupplier,
} from '../database/scmDB';
import { relativeTime } from '../utils/dateUtils';
import { hapticError, hapticLight, hapticSuccess } from '../utils/haptics';
import Modal from '../components/Modal';
import AiChatModal from '../components/AiChatModal';
import Toast, { type ToastState } from '../components/Toast';
import { AppButton, Chip, EmptyState, FieldLabel } from '../components/ui';
import type { Category, Insight, ResearchEntry, Supplier, SupplierGrade, SupplierStatus } from '../types';

export default function SupplierScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<SupplierGrade | 'all'>('all');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const reload = useCallback(async () => {
    try {
      const [sup, cat] = await Promise.all([getSuppliers(), getCategories()]);
      setSuppliers(sup);
      setCategories(cat);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    reload();
    const subs = [
      DeviceEventEmitter.addListener(SCM_EVENTS.SUPPLIER_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.CATEGORY_CHANGED, reload),
      DeviceEventEmitter.addListener(SCM_EVENTS.DATA_IMPORTED, reload),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [reload]);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const categoryName = useCallback((id: number | null) => {
    if (id == null) return '';
    return categories.find((c) => c.id === id)?.name ?? '';
  }, [categories]);

  const filtered = useMemo(() => {
    let list = suppliers;
    if (gradeFilter !== 'all') list = list.filter((s) => s.grade === gradeFilter);
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(kw) || s.code.toLowerCase().includes(kw) ||
        (s.contact || '').toLowerCase().includes(kw)
      );
    }
    return list;
  }, [suppliers, gradeFilter, search]);

  const handleSave = useCallback(async (data: Partial<Supplier>) => {
    try {
      if (editing) {
        await updateSupplier(editing.id, data);
        showToast('已保存');
      } else {
        await addSupplier({
          name: data.name ?? '', code: data.code ?? '', categoryId: data.categoryId ?? null,
          grade: data.grade ?? 'qualified', status: data.status ?? 'potential',
          contact: data.contact ?? '', phone: data.phone ?? '', email: data.email ?? '', note: data.note ?? '',
        });
        showToast('供应商已添加');
      }
      setFormVisible(false);
      setEditing(null);
      hapticSuccess();
      DeviceEventEmitter.emit(SCM_EVENTS.SUPPLIER_CHANGED);
      reload();
    } catch {
      hapticError();
      showToast('保存失败', 'error');
    }
  }, [editing, showToast, reload]);

  const handleDelete = useCallback((s: Supplier) => {
    Alert.alert('删除供应商', `确定删除「${s.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try {
            await deleteSupplier(s.id);
            hapticSuccess();
            setDetail(null);
            DeviceEventEmitter.emit(SCM_EVENTS.SUPPLIER_CHANGED);
            reload();
          } catch { hapticError(); }
        },
      },
    ]);
  }, [reload]);

  const handleAiAnalyze = useCallback((s: Supplier) => {
    const cat = categoryName(s.categoryId);
    setAiPrompt(
      `请分析以下供应商，给出评估与改进建议（可包含 SWOT、供应风险、品类匹配）：\n` +
      `供应商：${s.name}\n所属品类：${cat || '未分类'}\n分级：${getGradeDef(s.grade).label}\n状态：${getStatusDef(s.status).label}\n备注：${s.note || '无'}`
    );
    setAiVisible(true);
  }, [categoryName]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>供应商</Text>
        <Pressable style={styles.addBtn} onPress={() => { setEditing(null); setFormVisible(true); }}>
          <Text style={styles.addBtnText}>＋ 新增</Text>
        </Pressable>
      </View>

      {/* 搜索 + 筛选 */}
      <View style={styles.filterBlock}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索名称 / 编码 / 联系人"
          placeholderTextColor={COLORS.textTertiary}
          value={search}
          onChangeText={setSearch}
          maxLength={20}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradeRow}>
          <Chip label="全部" active={gradeFilter === 'all'} onPress={() => setGradeFilter('all')} />
          {SUPPLIER_GRADES.map((g) => (
            <Chip
              key={g.key}
              label={g.label}
              active={gradeFilter === g.key}
              color={g.color}
              onPress={() => setGradeFilter(g.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* 列表 */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <EmptyState emoji="🏭" text="还没有供应商，点击右上角新增" />
        ) : (
          filtered.map((s) => {
            const grade = getGradeDef(s.grade);
            const status = getStatusDef(s.status);
            return (
              <Pressable key={s.id} style={styles.supplierCard} onPress={() => setDetail(s)}>
                <View style={styles.cardTop}>
                  <Text style={styles.supplierName}>{s.name}</Text>
                  <View style={[styles.gradeBadge, { backgroundColor: `${grade.color}1A` }]}>
                    <Text style={[styles.gradeBadgeText, { color: grade.color }]}>{grade.label}</Text>
                  </View>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>{categoryName(s.categoryId) || '未分类'}</Text>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={styles.metaText}>{status.label}</Text>
                  {s.contact ? <Text style={styles.metaText}>· {s.contact}</Text> : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* 新增/编辑弹窗 */}
      <SupplierFormModal
        visible={formVisible}
        editing={editing}
        categories={categories}
        onClose={() => { setFormVisible(false); setEditing(null); }}
        onSave={handleSave}
      />
      {/* 详情弹窗 */}
      <SupplierDetailModal
        supplier={detail}
        categoryName={detail ? categoryName(detail.categoryId) : ''}
        onClose={() => setDetail(null)}
        onEdit={(s) => { setDetail(null); setEditing(s); setFormVisible(true); }}
        onDelete={handleDelete}
        onAiAnalyze={handleAiAnalyze}
      />
      <AiChatModal visible={aiVisible} onClose={() => setAiVisible(false)} initialPrompt={aiPrompt} />
      <Toast toast={toast} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

// ===== 表单弹窗 =====
function SupplierFormModal({ visible, editing, categories, onClose, onSave }: {
  visible: boolean; editing: Supplier | null; categories: Category[];
  onClose: () => void; onSave: (data: Partial<Supplier>) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [grade, setGrade] = useState<SupplierGrade>('qualified');
  const [status, setStatus] = useState<SupplierStatus>('potential');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setName(editing?.name ?? '');
      setCode(editing?.code ?? '');
      setCategoryId(editing?.categoryId ?? null);
      setGrade(editing?.grade ?? 'qualified');
      setStatus(editing?.status ?? 'potential');
      setContact(editing?.contact ?? '');
      setPhone(editing?.phone ?? '');
      setEmail(editing?.email ?? '');
      setNote(editing?.note ?? '');
    }
  }, [visible, editing]);

  return (
    <Modal visible={visible} title={editing ? '编辑供应商' : '新增供应商'} onClose={onClose} height={620}>
      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FieldLabel>名称 *</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="供应商名称" placeholderTextColor={COLORS.textTertiary} value={name} onChangeText={setName} maxLength={40} />
        <FieldLabel>编码</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="内部编码（可选）" placeholderTextColor={COLORS.textTertiary} value={code} onChangeText={setCode} maxLength={20} />
        <FieldLabel>所属品类</FieldLabel>
        <View style={styles.chipWrap}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={categoryId === c.id}
              onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
            />
          ))}
          {categories.length === 0 ? <Text style={styles.emptyNote}>请先在「品类」页创建品类</Text> : null}
        </View>
        <FieldLabel>分级</FieldLabel>
        <View style={styles.chipWrap}>
          {SUPPLIER_GRADES.map((g) => (
            <Chip
              key={g.key}
              label={g.label}
              active={grade === g.key}
              color={g.color}
              onPress={() => setGrade(g.key)}
            />
          ))}
        </View>
        <FieldLabel>状态</FieldLabel>
        <View style={styles.chipWrap}>
          {SUPPLIER_STATUSES.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              active={status === s.key}
              color={s.color}
              onPress={() => setStatus(s.key)}
            />
          ))}
        </View>
        <FieldLabel>联系人</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="姓名" placeholderTextColor={COLORS.textTertiary} value={contact} onChangeText={setContact} maxLength={20} />
        <FieldLabel>电话</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="联系电话" placeholderTextColor={COLORS.textTertiary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} />
        <FieldLabel>邮箱</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="邮箱" placeholderTextColor={COLORS.textTertiary} value={email} onChangeText={setEmail} keyboardType="email-address" maxLength={40} />
        <FieldLabel>备注</FieldLabel>
        <TextInput style={[styles.fieldInput, styles.multiline]} placeholder="其他信息" placeholderTextColor={COLORS.textTertiary} value={note} onChangeText={setNote} multiline maxLength={300} />
      </ScrollView>
      <AppButton title="保存" onPress={() => onSave({ name, code, categoryId, grade, status, contact, phone, email, note })} disabled={!name.trim()} />
    </Modal>
  );
}

// ===== 详情弹窗 =====
function SupplierDetailModal({ supplier, categoryName, onClose, onEdit, onDelete, onAiAnalyze }: {
  supplier: Supplier | null; categoryName: string;
  onClose: () => void; onEdit: (s: Supplier) => void; onDelete: (s: Supplier) => void;
  onAiAnalyze: (s: Supplier) => void;
}) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [research, setResearch] = useState<ResearchEntry[]>([]);

  useEffect(() => {
    if (!supplier) return;
    (async () => {
      try {
        const [ins, res] = await Promise.all([
          getInsights('supplier', supplier.id),
          getResearchEntries(supplier.id),
        ]);
        setInsights(ins);
        setResearch(res);
      } catch {
        setInsights([]);
        setResearch([]);
      }
    })();
  }, [supplier]);

  if (!supplier) return null;
  const grade = getGradeDef(supplier.grade);
  const status = getStatusDef(supplier.status);

  return (
    <Modal visible={!!supplier} title={supplier.name} onClose={onClose} height={640}>
      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        {/* 基本信息 */}
        <View style={styles.detailHeader}>
          <View style={[styles.gradeBadge, { backgroundColor: `${grade.color}1A` }]}>
            <Text style={[styles.gradeBadgeText, { color: grade.color }]}>{grade.label}供应商</Text>
          </View>
          <View style={[styles.statusDotRow, { backgroundColor: `${status.color}1A` }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.gradeBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.detailInfo}>
          <DetailRow label="所属品类" value={categoryName || '未分类'} />
          {supplier.code ? <DetailRow label="编码" value={supplier.code} /> : null}
          {supplier.contact ? <DetailRow label="联系人" value={supplier.contact} /> : null}
          {supplier.phone ? <DetailRow label="电话" value={supplier.phone} /> : null}
          {supplier.email ? <DetailRow label="邮箱" value={supplier.email} /> : null}
          {supplier.note ? <DetailRow label="备注" value={supplier.note} /> : null}
        </View>

        {/* 操作 */}
        <View style={styles.detailActions}>
          <Pressable style={[styles.actionBtn, { backgroundColor: COLORS.accent }]} onPress={() => onAiAnalyze(supplier)}>
            <Text style={styles.actionBtnText}>🤖 AI 分析</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: COLORS.bgAlt }]} onPress={() => onEdit(supplier)}>
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>✏️ 编辑</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: '#FCE4EC' }]} onPress={() => onDelete(supplier)}>
            <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>🗑 删除</Text>
          </Pressable>
        </View>

        {/* 关联洞察 */}
        <Text style={styles.detailSection}>关联洞察（{insights.length}）</Text>
        {insights.length === 0 ? (
          <Text style={styles.emptyText}>暂无洞察，可从首页记录后关联</Text>
        ) : (
          insights.map((i) => (
            <View key={i.id} style={styles.subRow}>
              <Text style={styles.subText}>{i.content}</Text>
              <Text style={styles.subMeta}>{relativeTime(i.createdAt)}</Text>
            </View>
          ))
        )}

        {/* 关联调研 */}
        <Text style={styles.detailSection}>关联调研（{research.length}）</Text>
        {research.length === 0 ? (
          <Text style={styles.emptyText}>暂无调研记录，可到「调研」页添加</Text>
        ) : (
          research.map((r) => (
            <View key={r.id} style={styles.subRow}>
              <Text style={styles.subText} numberOfLines={2}>{r.content || r.question}</Text>
              <Text style={styles.subMeta}>{relativeTime(r.createdAt)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  pageTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: 10, minHeight: 44, justifyContent: 'center', ...SHADOW_PRIMARY },
  addBtnText: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: '700' },
  filterBlock: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md, gap: SPACING.sm },
  searchInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 9, fontSize: FONT_SIZE.md, color: COLORS.text, ...SHADOW,
  },
  gradeRow: { gap: SPACING.sm, paddingVertical: 2 },
  list: { flex: 1, marginTop: SPACING.sm },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  emptyNote: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, marginTop: SPACING.xs },
  supplierCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supplierName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, flex: 1 },
  gradeBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  gradeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.xs + 2 },
  metaText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  // 表单
  formScroll: { flex: 1 },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONT_SIZE.md, color: COLORS.text,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  // 详情
  detailHeader: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  detailInfo: { marginBottom: SPACING.sm },
  detailRow: { flexDirection: 'row', paddingVertical: 5, gap: SPACING.md },
  detailLabel: { width: 60, fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  detailValue: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text },
  detailActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  actionBtn: { flex: 1, minHeight: 44, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: '#FFFFFF' },
  detailSection: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  subRow: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm + 2, marginBottom: SPACING.xs,
  },
  subText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 19 },
  subMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 3 },
});
