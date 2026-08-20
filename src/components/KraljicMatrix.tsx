import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS, SPACING, getKraljicQuadrant, getQuadrantDef } from '../constants';
import type { Category } from '../types';

interface Props {
  categories: Category[];
  onSelect?: (category: Category) => void;
  selectedId?: number | null;
}

// Kraljic 矩阵四象限图（X=供应风险，Y=采购影响）
export default function KraljicMatrix({ categories, onSelect, selectedId }: Props) {
  const half = 50;
  // 四象限背景（左上 bottleneck, 右上 strategic, 左下 routine, 右下 leverage）
  const quads = [
    { x: 0, y: 0, q: 'bottleneck' as const },
    { x: half, y: 0, q: 'strategic' as const },
    { x: 0, y: half, q: 'routine' as const },
    { x: half, y: half, q: 'leverage' as const },
  ];

  // 风险 1-5 → x 8~92；影响 1-5 → y 92~8（影响大在上）
  const toX = (risk: number) => 8 + ((risk - 1) / 4) * 84;
  const toY = (impact: number) => 92 - ((impact - 1) / 4) * 84;

  return (
    <View>
      <Svg width="100%" height={280} viewBox="0 0 100 100">
        {/* 四象限背景 */}
        {quads.map((qd) => {
          const def = getQuadrantDef(qd.q);
          return (
            <Rect
              key={qd.q}
              x={qd.x + 1}
              y={qd.y + 1}
              width={half - 2}
              height={half - 2}
              rx={4}
              fill={`${def.color}14`}
            />
          );
        })}
        {/* 中线 */}
        <Line x1={half} y1={4} x2={half} y2={96} stroke={COLORS.borderSubtle} strokeWidth={0.6} strokeDasharray="2 2" />
        <Line x1={4} y1={half} x2={96} y2={half} stroke={COLORS.borderSubtle} strokeWidth={0.6} strokeDasharray="2 2" />
        {/* 象限标签 */}
        {quads.map((qd) => {
          const def = getQuadrantDef(qd.q);
          return (
            <SvgText
              key={`lbl-${qd.q}`}
              x={qd.x + half / 2}
              y={qd.y + half / 2 + 2}
              fontSize={5.5}
              fontWeight="700"
              fill={def.color}
              textAnchor="middle"
            >
              {def.label}
            </SvgText>
          );
        })}
        {/* 品类落点 */}
        {categories.map((c) => {
          const cx = toX(c.kraljicX);
          const cy = toY(c.kraljicY);
          const q = getKraljicQuadrant(c.kraljicX, c.kraljicY);
          const def = getQuadrantDef(q);
          const isSel = selectedId === c.id;
          return (
            <React.Fragment key={c.id}>
              {/* 透明触摸热区（加大点击区域） */}
              <Circle
                cx={cx}
                cy={cy}
                r={11}
                fill="transparent"
                onPress={() => onSelect?.(c)}
              />
              {/* 可见落点 */}
              <Circle
                cx={cx}
                cy={cy}
                r={isSel ? 4.5 : 3.5}
                fill={def.color}
                stroke="#fff"
                strokeWidth={1.2}
              />
            </React.Fragment>
          );
        })}
        {/* 轴标注 */}
        <SvgText x={50} y={99} fontSize={4} fill={COLORS.textTertiary} textAnchor="middle">供应风险 →</SvgText>
        <SvgText x={1} y={50} fontSize={4} fill={COLORS.textTertiary} textAnchor="middle" transform="rotate(-90 1 50)">采购影响 →</SvgText>
      </Svg>
    </View>
  );
}
