import React from 'react';
import {
  Pressable, StyleProp, StyleSheet, Text, View, ViewStyle,
} from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, SHADOW_PRIMARY, SPACING } from '../constants';

// ===== 卡片 =====
interface CardProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}
export function Card({ style, children }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ===== 可选中芯片（筛选/选择）=====
export interface ChipProps {
  label: string;
  active?: boolean;
  /** 激活时填充色，缺省用主色 */
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}
export function Chip({ label, active, color, onPress, style }: ChipProps) {
  const bg = active ? (color ?? COLORS.accent) : COLORS.surface;
  const fg = active ? '#FFFFFF' : COLORS.textSecondary;
  return (
    <Pressable
      style={[styles.chip, { backgroundColor: bg, borderColor: bg }, active && styles.chipActiveShadow, style]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: true }}
    >
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// ===== 主操作按钮（全宽，含禁用态）=====
interface AppButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}
export function AppButton({ title, onPress, disabled, style }: AppButtonProps) {
  return (
    <Pressable
      style={[styles.appButton, disabled && styles.appButtonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={disabled ? { disabled: true } : undefined}
      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
    >
      <Text style={styles.appButtonText}>{title}</Text>
    </Pressable>
  );
}

// ===== 表单字段标签 =====
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

// ===== 节标题 =====
interface SectionHeaderProps {
  icon?: string;
  title: string;
}
export function SectionHeader({ icon, title }: SectionHeaderProps) {
  return <Text style={styles.sectionHeader}>{icon ? `${icon}  ${title}` : title}</Text>;
}

// ===== 空状态 =====
interface EmptyStateProps {
  emoji: string;
  text: string;
}
export function EmptyState({ emoji, text }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    minHeight: 44,          // 触摸目标达标（Android 建议 ≥48dp，折衷 44）
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActiveShadow: { ...SHADOW },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  appButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    minHeight: 48,          // 触摸目标达标
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOW_PRIMARY,
  },
  appButtonDisabled: { opacity: 0.4 },
  appButtonText: { color: '#FFFFFF', fontSize: FONT_SIZE.md, fontWeight: '700' },
  fieldLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    fontWeight: '600',
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyEmoji: { fontSize: 40, opacity: 0.5 },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, textAlign: 'center' },
});