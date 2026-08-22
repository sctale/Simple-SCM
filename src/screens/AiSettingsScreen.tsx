import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, RADIUS, SHADOW_PRIMARY, SPACING } from '../constants';
import { addAiModel, deleteAiModel, getAiModels } from '../database/scmDB';
import { deleteModelKey, hasModelKey, saveModelKey } from '../utils/aiClient';
import { hapticError, hapticLight, hapticSuccess } from '../utils/haptics';
import Modal from '../components/Modal';
import AiChatModal from '../components/AiChatModal';
import Toast, { type ToastState } from '../components/Toast';
import { AppButton, Card, EmptyState, FieldLabel, SectionHeader } from '../components/ui';
import type { AiModel } from '../types';

interface Props {
  onBack: () => void;
}

// AI 模型二级管理页（从「我的 → AI 模型」进入）
export default function AiSettingsScreen({ onBack }: Props) {
  const [models, setModels] = useState<AiModel[]>([]);
  const [modelKeys, setModelKeys] = useState<Record<number, boolean>>({});
  const [keyModal, setKeyModal] = useState<AiModel | null>(null);
  const [keyText, setKeyText] = useState('');
  const [customModal, setCustomModal] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const reload = useCallback(async () => {
    try {
      const ms = await getAiModels();
      setModels(ms);
      const keyMap: Record<number, boolean> = {};
      for (const m of ms) {
        keyMap[m.id] = await hasModelKey(m.id);
      }
      setModelKeys(keyMap);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const handleSaveKey = useCallback(async () => {
    if (!keyModal) return;
    await saveModelKey(keyModal.id, keyText.trim());
    hapticSuccess();
    showToast(`已保存 ${keyModal.name} 的 Key`);
    setKeyModal(null);
    setKeyText('');
    reload();
  }, [keyModal, keyText, showToast, reload]);

  const handleDeleteModel = useCallback((m: AiModel) => {
    Alert.alert('删除模型', `确定删除「${m.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          await deleteAiModel(m.id);
          await deleteModelKey(m.id);
          hapticLight();
          reload();
        },
      },
    ]);
  }, [reload]);

  const handleAddCustom = useCallback(async (name: string, baseUrl: string, model: string) => {
    if (!name.trim() || !baseUrl.trim() || !model.trim()) {
      hapticError();
      showToast('请填写完整', 'error');
      return;
    }
    try {
      await addAiModel({ name: name.trim(), baseUrl: baseUrl.trim(), model: model.trim(), isBuiltin: false, temperature: 0.7 });
      hapticSuccess();
      showToast('模型已添加');
      setCustomModal(false);
      reload();
    } catch {
      hapticError();
    }
  }, [showToast, reload]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      {/* 顶部导航 */}
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="返回">
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.pageTitle}>AI 模型</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.aiAssistantBtn} onPress={() => setAiVisible(true)}>
          <Text style={styles.aiAssistantText}>💬 打开 AI 助手</Text>
        </Pressable>

        <SectionHeader icon="🤖" title="已配置模型" />
        <Card>
          {models.length === 0 ? (
            <EmptyState emoji="🤖" text="暂无模型，点下方添加" />
          ) : (
            models.map((m) => (
              <View key={m.id} style={styles.modelRow}>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{m.name}</Text>
                  <Text style={styles.modelSub} numberOfLines={1}>{m.model}</Text>
                </View>
                <View style={[styles.keyBadge, modelKeys[m.id] ? styles.keyBadgeOn : styles.keyBadgeOff]}>
                  <Text style={[styles.keyBadgeText, modelKeys[m.id] && styles.keyBadgeTextOn]}>
                    {modelKeys[m.id] ? '已配置' : '未配置'}
                  </Text>
                </View>
                <Pressable style={styles.modelBtn} onPress={() => { setKeyModal(m); setKeyText(''); }}>
                  <Text style={styles.modelBtnText}>Key</Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteModel(m)} hitSlop={10}>
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>
            ))
          )}
          <Pressable style={styles.addLink} onPress={() => setCustomModal(true)}>
            <Text style={styles.addLinkText}>＋ 添加自定义模型</Text>
          </Pressable>
        </Card>

        <Text style={styles.hint}>
          API Key 使用系统安全存储加密，仅存本机。MiniMax / DeepSeek 等均为 OpenAI 兼容接口，填入对应平台的 Key 即可。
        </Text>
      </ScrollView>

      {/* 配置 Key 弹窗（全屏） */}
      <KeyConfigModal
        visible={!!keyModal}
        name={keyModal?.name ?? ''}
        value={keyText}
        onChange={setKeyText}
        onClose={() => setKeyModal(null)}
        onSave={handleSaveKey}
      />

      {/* 自定义模型弹窗（全屏） */}
      <CustomModelModal visible={customModal} onClose={() => setCustomModal(false)} onSave={handleAddCustom} />

      <AiChatModal visible={aiVisible} onClose={() => setAiVisible(false)} />
      <Toast toast={toast} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

function KeyConfigModal({ visible, name, value, onChange, onClose, onSave }: {
  visible: boolean; name: string; value: string; onChange: (t: string) => void;
  onClose: () => void; onSave: () => void;
}) {
  return (
    <Modal visible={visible} title={`配置 ${name} API Key`} onClose={onClose}>
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <FieldLabel>API Key</FieldLabel>
        <TextInput
          style={styles.fieldInput}
          placeholder="粘贴 API Key"
          placeholderTextColor={COLORS.textTertiary}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          secureTextEntry
          maxLength={200}
          accessibilityLabel="API Key"
        />
        <Text style={styles.hint}>Key 使用系统安全存储加密，仅存本机</Text>
      </ScrollView>
      <AppButton title="保存" onPress={onSave} />
    </Modal>
  );
}

function CustomModelModal({ visible, onClose, onSave }: {
  visible: boolean; onClose: () => void; onSave: (name: string, baseUrl: string, model: string) => void;
}) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  useEffect(() => { if (visible) { setName(''); setBaseUrl(''); setModel(''); } }, [visible]);
  return (
    <Modal visible={visible} title="添加自定义模型" onClose={onClose}>
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <FieldLabel>显示名称</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="如 我的模型" placeholderTextColor={COLORS.textTertiary} value={name} onChangeText={setName} maxLength={20} />
        <FieldLabel>API Base URL（OpenAI 兼容）</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="https://api.xxx.com/v1" placeholderTextColor={COLORS.textTertiary} value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" maxLength={100} />
        <FieldLabel>模型标识</FieldLabel>
        <TextInput style={styles.fieldInput} placeholder="如 deepseek-chat" placeholderTextColor={COLORS.textTertiary} value={model} onChangeText={setModel} autoCapitalize="none" maxLength={50} />
      </ScrollView>
      <AppButton title="添加" onPress={() => onSave(name, baseUrl, model)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, lineHeight: 34, color: COLORS.text },
  pageTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  aiAssistantBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', marginBottom: SPACING.sm, ...SHADOW_PRIMARY },
  aiAssistantText: { color: '#FFFFFF', fontSize: FONT_SIZE.md, fontWeight: '700' },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  modelInfo: { flex: 1 },
  modelName: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '600' },
  modelSub: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 1 },
  keyBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  keyBadgeOn: { backgroundColor: '#E8F5E9' },
  keyBadgeOff: { backgroundColor: COLORS.bgAlt },
  keyBadgeText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, fontWeight: '600' },
  keyBadgeTextOn: { color: '#2E7D32' },
  modelBtn: { backgroundColor: COLORS.accentLight, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  modelBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.accentDark, fontWeight: '700' },
  deleteText: { fontSize: 13, color: COLORS.textTertiary, padding: 4 },
  addLink: { paddingVertical: 6 },
  addLinkText: { fontSize: FONT_SIZE.sm, color: COLORS.accent, fontWeight: '600' },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, lineHeight: 17 },
  formScroll: { flex: 1 },
  formContent: { padding: SPACING.lg },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONT_SIZE.md, color: COLORS.text,
  },
});