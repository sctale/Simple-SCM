import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, SHADOW_PRIMARY, SPACING } from '../constants';
import { getAiModels } from '../database/scmDB';
import { askModel, hasModelKey } from '../utils/aiClient';
import { hapticError, hapticLight } from '../utils/haptics';
import Modal from './Modal';
import type { AiMessage, AiModel } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

const QUICK_ACTIONS = [
  '生成供应商调研问题清单',
  '做一次供应商 SWOT 分析',
  '识别潜在供应风险',
  '生成采购战略建议',
];

// AI 对话助手（可自定义模型）
export default function AiChatModal({ visible, onClose, initialPrompt }: Props) {
  const [models, setModels] = useState<AiModel[]>([]);
  const [modelId, setModelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const list = await getAiModels();
      setModels(list);
      if (list.length > 0) setModelId((prev) => (prev && list.some((m) => m.id === prev) ? prev : list[0].id));
      if (initialPrompt) {
        setMessages([]);
        setInput(initialPrompt);
      } else {
        setMessages([]);
        setInput('');
      }
      setError(null);
    })();
  }, [visible, initialPrompt]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    if (modelId == null) {
      setError('请先在「我的」页配置 AI 模型');
      return;
    }
    if (!(await hasModelKey(modelId))) {
      setError('该模型尚未配置 API Key，请到「我的 → AI 模型」填写');
      return;
    }
    setInput('');
    setError(null);
    setLoading(true);
    const userMsg: AiMessage = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    try {
      const reply = await askModel(modelId, content);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `⚠️ 请求失败：${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, modelId, messages]);

  // 初始提示自动发送一次
  const autoSent = useRef(false);
  useEffect(() => {
    if (visible && initialPrompt && !autoSent.current) {
      autoSent.current = true;
      send(initialPrompt);
    }
    if (!visible) autoSent.current = false;
  }, [visible, initialPrompt, send]);

  return (
    <Modal visible={visible} title="AI 智能助手" onClose={onClose} height={620}>
      {/* 模型选择 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelRow} contentContainerStyle={{ gap: SPACING.sm }}>
        {models.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.modelChip, modelId === m.id && styles.modelChipOn]}
            onPress={() => { setModelId(m.id); hapticLight(); }}
          >
            <Text style={[styles.modelChipText, modelId === m.id && styles.modelChipTextOn]}>{m.name}</Text>
          </Pressable>
        ))}
        {models.length === 0 ? (
          <Text style={styles.emptyModel}>未配置模型，请到「我的」页添加</Text>
        ) : null}
      </ScrollView>

      {/* 对话区 */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.welcome}>
            <Text style={styles.welcomeEmoji}>🤖</Text>
            <Text style={styles.welcomeText}>我是你的供应链管理助手{'\n'}精通 CPSM 与 PMP 知识体系</Text>
            <View style={styles.quickRow}>
              {QUICK_ACTIONS.map((q) => (
                <Pressable key={q} style={styles.quickChip} onPress={() => send(q)}>
                  <Text style={styles.quickChipText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((m, i) => (
            <View key={i} style={[styles.msgRow, m.role === 'user' ? styles.msgUserRow : styles.msgAssistantRow]}>
              <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={m.role === 'user' ? styles.userText : styles.assistantText}>{m.content}</Text>
              </View>
            </View>
          ))
        )}
        {loading ? (
          <View style={styles.msgAssistantRow}>
            <View style={[styles.bubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* 输入区 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="输入问题，如「分析这家供应商的风险」"
          placeholderTextColor={COLORS.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendText}>发送</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modelRow: {
    flexGrow: 0,
    marginBottom: SPACING.sm,
  },
  modelChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelChipOn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modelChipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modelChipTextOn: {
    color: '#FFFFFF',
  },
  emptyModel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  welcome: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  welcomeEmoji: {
    fontSize: 44,
  },
  welcomeText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickChip: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    minHeight: 44,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.accentDark,
    fontWeight: '600',
  },
  msgRow: {
    flexDirection: 'row',
  },
  msgUserRow: {
    justifyContent: 'flex-end',
  },
  msgAssistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  userBubble: {
    backgroundColor: COLORS.accent,
    borderTopRightRadius: RADIUS.xs,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: RADIUS.xs,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
  },
  assistantText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    paddingVertical: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    maxHeight: 90,
  },
  sendBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 11,
    justifyContent: 'center',
    ...SHADOW_PRIMARY,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
});
