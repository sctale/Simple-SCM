import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOW, SPACING } from '../constants';

export type TabKey = 'home' | 'supplier' | 'category' | 'research' | 'mine';

interface Props {
  current: TabKey;
  onChange: (key: TabKey) => void;
}

const TABS: { key: TabKey; emoji: string; label: string }[] = [
  { key: 'home', emoji: '🏠', label: '首页' },
  { key: 'supplier', emoji: '🏭', label: '供应商' },
  { key: 'category', emoji: '🗂️', label: '品类' },
  { key: 'research', emoji: '🔍', label: '调研' },
  { key: 'mine', emoji: '⚙️', label: '我的' },
];

export default function TabBar({ current, onChange }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const active = tab.key === current;
          return (
            <Pressable
              key={tab.key}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => onChange(tab.key)}
              android_ripple={{ color: 'rgba(63,81,181,0.08)', borderless: true }}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Text style={[styles.emoji, active && { transform: [{ scale: 1.1 }] }]}>{tab.emoji}</Text>
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    ...SHADOW,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    gap: 2,
    borderRadius: RADIUS.lg,
  },
  itemActive: {
    backgroundColor: COLORS.accentLight,
  },
  iconWrap: {
    width: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  iconWrapActive: {
    backgroundColor: '#FFFFFF',
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.accentDark,
    fontWeight: '700',
  },
});
