import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { SectionId, sectionColor, sections } from '../utils/sections';

interface Props {
  section: SectionId;
  size?: number;
}

// Белый глиф на плитке цвета раздела
export default function SectionIcon({ section, size = 32 }: Props) {
  const glyph = Math.round(size * 0.62);
  const stroke = size <= 20 ? 2.6 : size <= 36 ? 2.2 : 1.8;
  return (
    <View
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.24),
        backgroundColor: sectionColor(section),
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Svg
        width={glyph} height={glyph} viewBox="0 0 24 24" fill="none"
        stroke="#fff" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      >
        <Glyph section={section} />
      </Svg>
    </View>
  );
}

function Glyph({ section }: { section: SectionId }) {
  switch (section) {
    case 'books':
      return (
        <>
          <Path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z" />
          <Path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
        </>
      );
    case 'films':
      return (
        <>
          <Rect x={3} y={10} width={18} height={11} rx={1.5} />
          <Path d="M3 10l16.5-4.6 1 3.4L4 13.4" />
          <Path d="M8.5 8.5l-2-3.2M14 7l-2-3.2" />
        </>
      );
    case 'series':
      return (
        <>
          <Rect x={3} y={3} width={18} height={13} rx={2} />
          <Path d="M10 7v5l4-2.5z" fill="#fff" />
          <Path d="M3 20.5h4M10 20.5h4M17 20.5h4" />
        </>
      );
    case 'exhibitions':
      return (
        <>
          <Path d="M3 9l9-5.5L21 9z" />
          <Path d="M5.5 11.5v6.5M10 11.5v6.5M14 11.5v6.5M18.5 11.5v6.5M3 21h18" />
        </>
      );
    case 'concerts':
      return (
        <>
          <Rect x={9} y={2.5} width={6} height={11} rx={3} />
          <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4M9 21.5h6" />
        </>
      );
  }
}

// Цветок: по лепестку на каждый раздел
export function FlowerLogo({ size = 32 }: { size?: number }) {
  const step = 360 / sections.length;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {sections.map((s, i) => (
        <Ellipse
          key={s.id}
          cx={32} cy={17} rx={10} ry={14}
          fill={s.color}
          transform={`rotate(${i * step} 32 32)`}
        />
      ))}
      <Circle cx={32} cy={32} r={7} fill="#faf6ed" />
    </Svg>
  );
}
