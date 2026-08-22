import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS, getKraljicQuadrant, getQuadrantDef } from '../constants';
import type { Category } from '../types';

interface Props {
  categories: Category[];
  onSelect?: (category: Category) => void;
  selectedId?: number | null;
}

// 内容安全区：左右预留纵向轴标注，上下预留横向轴标注，避免越界/裁切
const BOX = { left: 14, top: 10, right: 94, bottom: 90 };

// Kraljic 矩阵四象限图（X=供应风险，Y=采购影响）
export default function KraljicMatrix({ categories, onSelect, selectedId }: Props) {
  const qw = (BOX.right - BOX.left) / 2; // 每象限宽
  const qh = (BOX.bottom - BOX.top) / 2; // 每象限高
  const midX = BOX.left + qw;
  const midY = BOX.top + qh;

  // 四象限背景（左上 leverage, 右上 strategic, 左下 routine, 右下 bottleneck）
  const quads = [
    { x: BOX.left, y: BOX.top, q: 'leverage' as const },
    { x: midX, y: BOX.top, q: 'strategic' as const },
    { x: BOX.left, y: midY, q: 'routine' as const },
    { x: midX, y: midY, q: 'bottleneck' as const },
  ];

  // 风险 1-5 → x[left~right]；影响 1-5 → y[bottom~top]（影响大在上）
  const toX = (risk: number) => BOX.left + ((risk - 1) / 4) * (BOX.right - BOX.left);
  const toY = (impact: number) => BOX.bottom - ((impact - 1) / 4) * (BOX.bottom - BOX.top);

  return (
    // 等比容器：使 viewBox 正方形不被拉伸，落点/象限保持正圆
    <View style={{ width: '100%', aspectRatio: 1 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* 四象限背景 */}
        {quads.map((qd) => {
          const def = getQuadrantDef(qd.q);
          return (
            <Rect
              key={qd.q}
              x={qd.x + 0.5}
              y={qd.y + 0.5}
              width={qw - 1}
              height={qh - 1}
              rx={4}
              fill={`${def.color}14`}
            />
          );
        })}
        {/* 中线 */}
        <Line x1={midX} y1={BOX.top} x2={midX} y2={BOX.bottom} stroke={COLORS.borderSubtle} strokeWidth={0.6} strokeDasharray="2 2" />
        <Line x1={BOX.left} y1={midY} x2={BOX.right} y2={midY} stroke={COLORS.borderSubtle} strokeWidth={0.6} strokeDasharray="2 2" />
        {/* 象限标签 */}
        {quads.map((qd) => {
          const def = getQuadrantDef(qd.q);
          return (
            <SvgText
              key={`lbl-${qd.q}`}
              x={qd.x + qw / 2}
              y={qd.y + qh / 2 + 1.5}
              fontSize={5}
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
                accessible
                accessibilityLabel={`${c.name}，${def.label}`}
                onPress={() => onSelect?.(c)}
              />
              {/* 可见落点 */}
              <Circle cx={cx} cy={cy} r={isSel ? 4.5 : 3.5} fill={def.color} stroke="#fff" strokeWidth={1.2} />
            </React.Fragment>
          );
        })}
        {/* 轴标注：纵向在左侧安全区内旋转，避免裁切 */}
        <SvgText
          x={BOX.left - 5}
          y={midY}
          fontSize={4}
          fill={COLORS.textTertiary}
          textAnchor="end"
          transform={`rotate(-90 ${BOX.left - 5} ${midY})`}
        >
          采购影响 →
        </SvgText>
        <SvgText x={midX} y={BOX.bottom + 8} fontSize={4} fill={COLORS.textTertiary} textAnchor="middle">供应风险 →</SvgText>
      </Svg>
    </View>
  );
}