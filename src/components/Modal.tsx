import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** 兼容旧调用：全屏模式下忽略固定高度 */
  height?: number;
}

// 通用全屏弹窗页（顶部 ‹ 返回 + 标题栏 + 内容区）
// 统一所有弹出页面为全屏，符合 Android 16 沉浸式交互
export default function Modal({ visible, title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
      accessibilityViewIsModal
      aria-modal={true}
    >
      <View style={styles.screen}>
        {/* 顶部导航栏 */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <Pressable
            style={styles.headerBtn}
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="关闭"
          >
            <Text style={styles.closeIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {/* 右侧占位，保证标题居中 */}
          <View style={styles.headerBtn} />
        </View>

        {/* 内容区 */}
        <View style={[styles.body, { paddingBottom: insets.bottom }]}>{children}</View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 30,
    lineHeight: 32,
    color: COLORS.text,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.text,
    marginHorizontal: SPACING.xs,
  },
  body: {
    flex: 1,
  },
});