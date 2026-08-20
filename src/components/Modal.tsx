import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated, Modal as RNModal, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
}

// 通用底部弹窗（下滑关闭 + 淡入淡出 + 高度自适应屏幕）
export default function Modal({ visible, title, onClose, children, height }: Props) {
  const translateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const { height: winHeight } = useWindowDimensions();

  // 高度上限 85%，避免小屏溢出
  const sheetHeight = height != null ? Math.min(height, winHeight * 0.85) : undefined;

  useEffect(() => {
    if (visible) {
      translateY.setValue(600);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 72 }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 620, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, translateY, backdropOpacity]);

  const springBack = useCallback(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 72 }).start();
  }, [translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 110 || g.vy > 0.8) close();
          else springBack();
        },
        onPanResponderTerminate: springBack,
      }),
    [translateY, close, springBack]
  );

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={close}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.absFill, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdrop} onPress={close} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetHeight ? { height: sheetHeight } : null, { transform: [{ translateY }] }]}>
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  absFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,30,40,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '90%',
  },
  handleArea: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: -10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
});
