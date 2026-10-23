import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import { SectionId, sections } from '../utils/sections';
import { colors } from '../utils/theme';
import SectionIcon, { FlowerLogo } from './SectionIcon';

// Верхний отступ безопасной зоны берёт на себя шапка, экраны вкладок его не добавляют
export const TAB_EDGES: Edge[] = ['right', 'bottom', 'left'];

interface Props {
  current: SectionId;
  onSelect: (id: SectionId) => void;
}

// Шапка приложения: название раздела открывает меню разделов культурного дневника
export default function SectionHeader({ current, onSelect }: Props) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <View
      style={[styles.header, { paddingTop: insets.top + 8 }]}
      onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
    >
      <Pressable
        style={styles.titleButton}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <SectionIcon section={current} size={36} />
        <View>
          <Text style={styles.caption}>{t(language, 'sections.diary')}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t(language, `sections.${current}`)}</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M6 9l6 6 6-6" />
            </Svg>
          </View>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { top: headerHeight }]}
          onPress={() => setOpen(false)}
          accessibilityLabel={t(language, 'common.close')}
        />
        <View style={[styles.menu, { top: headerHeight - 4 }]} accessibilityRole="menu">
          <View style={styles.menuHeading}>
            <FlowerLogo size={24} />
            <Text style={styles.menuHeadingText}>{t(language, 'sections.diary')}</Text>
          </View>
          {sections.map(s => {
            const active = s.id === current;
            return (
              <Pressable
                key={s.id}
                style={[styles.item, active && styles.itemActive]}
                disabled={!s.available}
                onPress={() => { onSelect(s.id); setOpen(false); }}
                accessibilityRole="menuitem"
                accessibilityState={{ disabled: !s.available, selected: active }}
              >
                <View style={!s.available && styles.iconSoon}>
                  <SectionIcon section={s.id} size={32} />
                </View>
                <Text style={[styles.itemLabel, !s.available && styles.itemLabelSoon]}>
                  {t(language, `sections.${s.id}`)}
                </Text>
                {!s.available && <Text style={styles.soon}>{t(language, 'sections.soon')}</Text>}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 8, paddingBottom: 8,
    backgroundColor: colors.bg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  titleButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 8, paddingVertical: 4,
  },
  caption: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    textTransform: 'uppercase', color: colors.textMuted,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.accent, fontFamily: colors.fontTitle },
  backdrop: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(20,16,10,0.28)',
  },
  menu: {
    position: 'absolute', left: 12, width: 300, padding: 6,
    borderRadius: 14, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuHeading: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#eee6d8', marginBottom: 4,
  },
  menuHeadingText: { fontSize: 14, fontWeight: '600', color: '#5d564d' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 52, paddingHorizontal: 10, borderRadius: 10,
  },
  itemActive: { backgroundColor: '#fbf1dc' },
  iconSoon: { opacity: 0.55 },
  itemLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1f1a14' },
  itemLabelSoon: { color: '#6f6a63' },
  soon: { fontSize: 13, color: '#6f6a63' },
});
