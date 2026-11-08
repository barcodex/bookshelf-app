import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import {
  LadderItem, TOP, buildLadder, computeRatings, gapSignature, itemKey, moveItem,
} from '../utils/ratingLadder';
import { colors } from '../utils/theme';

export interface LadderCard {
  slug: string;
  title: string;
  subtitle: string;
  note?: string;  // пометка вроде «не досмотрено»
  rating: number;
}

interface Props {
  cards: LadderCard[];  // при равных оценках порядок берётся отсюда
  onSave: (ratings: Record<string, number>) => Promise<void>;
}

// Высоты строк фиксированы: по ним место под пальцем считается сразу, без ожидания onLayout
const CARD_H = 58;
const LINE_H = 40;
const EDGE = 64;  // у края экрана список прокручивается сам

const rowHeight = (it: LadderItem) => (it.kind === 'line' ? LINE_H : CARD_H);
const webDrag = Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab' } as object) : null;
const noSelect = Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : null;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Лестница рейтинга: карточки и линии целых оценок перетаскиваются, рейтинг задаётся местом в списке
export default function RatingLadder({ cards, onSave }: Props) {
  const { language } = useLanguage();
  const bySlug = useMemo(() => Object.fromEntries(cards.map(c => [c.slug, c])), [cards]);

  // Сохранённое состояние, относительно которого считаются изменения
  const [base, setBase] = useState(() => makeBase(cards));
  const [seq, setSeq] = useState<LadderItem[]>(() => buildLadder(cards));
  const ratings = useMemo(() => computeRatings(seq, base.ratings, base.gaps), [seq, base]);
  const changed = useMemo(
    () => Object.keys(ratings).filter(slug => ratings[slug] !== base.ratings[slug]),
    [ratings, base],
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dragKey, setDragKey] = useState<string | null>(null);

  // Пока несохранённых изменений нет, лестница следует за свежими данными
  useEffect(() => {
    if (changed.length > 0 || saveState === 'saving') return;
    setBase(makeBase(cards));
    setSeq(buildLadder(cards));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const latest = useRef({ seq, ratings, changed, saveState });
  latest.current = { seq, ratings, changed, saveState };

  const save = useCallback(async () => {
    const { seq: s, ratings: r, changed: c, saveState: st } = latest.current;
    if (c.length === 0 || st === 'saving') return;
    setSaveState('saving');
    try {
      await onSave(Object.fromEntries(c.map(slug => [slug, r[slug]])));
      setBase({ ratings: r, gaps: gapSignature(s) });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [onSave]);

  // Уход со страницы: размонтирование (другая вкладка или раздел) и скрытие вкладки браузера
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [save]);
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => () => { saveRef.current(); }, []);
  // Вкладки не размонтируются при переключении, поэтому сохраняем и при потере фокуса
  useFocusEffect(useCallback(() => () => { saveRef.current(); }, []));

  useEffect(() => {
    if (saveState !== 'saved') return;
    const id = setTimeout(() => setSaveState('idle'), 2000);
    return () => clearTimeout(id);
  }, [saveState]);

  // ---- перетаскивание ----
  const scrollRef = useRef<ScrollView>(null);
  const frameRef = useRef<View>(null);
  const scrollY = useRef(0);
  const viewport = useRef({ top: 0, height: 0 });
  const contentH = useRef(0);
  const listTop = useRef(0);
  const pointer = useRef(0);
  const dragging = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const seqRef = useRef(seq);
  seqRef.current = seq;

  const moveTo = useCallback((pageY: number) => {
    const key = dragging.current;
    if (!key) return;
    const y = pageY - viewport.current.top + scrollY.current - listTop.current;
    const rest = seqRef.current.filter(it => itemKey(it) !== key);
    let to = rest.length;
    let top = 0;
    for (let i = 0; i < rest.length; i++) {
      const h = rowHeight(rest[i]);
      if (y < top + h / 2) { to = i; break; }
      top += h;
    }
    const next = moveItem(seqRef.current, key, to);
    if (next) { seqRef.current = next; setSeq(next); }
  }, []);

  const tick = useCallback(() => {
    const { top, height } = viewport.current;
    const p = pointer.current - top;
    let delta = 0;
    if (p < EDGE) delta = -(EDGE - p) / 3;
    else if (p > height - EDGE) delta = (p - (height - EDGE)) / 3;
    if (delta) {
      const max = Math.max(0, contentH.current - height);
      const y = Math.min(max, Math.max(0, scrollY.current + delta));
      if (y !== scrollY.current) {
        scrollY.current = y;
        scrollRef.current?.scrollTo({ y, animated: false });
      }
    }
    moveTo(pointer.current);
  }, [moveTo]);

  const start = useCallback((key: string, pageY: number) => {
    dragging.current = key;
    pointer.current = pageY;
    frameRef.current?.measureInWindow((_x, y, _w, h) => { viewport.current = { top: y, height: h }; });
    setDragKey(key);
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle');
    timer.current = setInterval(tick, 16);
  }, [tick, saveState]);

  const end = useCallback(() => {
    dragging.current = null;
    setDragKey(null);
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const handlers = useRef({ start, end, move: (y: number) => { pointer.current = y; } });
  handlers.current.start = start;
  handlers.current.end = end;

  const status =
    saveState === 'saving' ? t(language, 'ladder.saving')
    : saveState === 'error' ? t(language, 'ladder.saveError')
    : saveState === 'saved' && changed.length === 0 ? t(language, 'ladder.saved')
    : changed.length > 0 ? t(language, 'ladder.unsaved').replace('{count}', String(changed.length))
    : t(language, 'ladder.noChanges');

  return (
    <View style={[styles.container, noSelect]}>
      <View ref={frameRef} style={styles.frame} collapsable={false}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!dragKey}
        scrollEventThrottle={16}
        onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        onContentSizeChange={(_, h) => { contentH.current = h; }}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.hint}>{t(language, 'ladder.hint')}</Text>
        <View onLayout={e => { listTop.current = e.nativeEvent.layout.y; }}>
          {seq.map(it => {
            const key = itemKey(it);
            const active = key === dragKey;
            if (it.kind === 'line') {
              const fixed = it.value === TOP;
              return (
                <View key={key} style={styles.line}>
                  <View style={[styles.rule, styles.ruleShort, it.value === 0 && styles.ruleZero]} />
                  {fixed ? (
                    <Text style={[styles.pill, styles.pillFixed]}>{it.value}</Text>
                  ) : (
                    <DragHandle id={key} handlers={handlers} label={`${t(language, 'ladder.drag')} ${it.value}`}>
                      <Text style={[styles.pill, it.value === 0 && styles.pillZero, active && styles.pillActive]}>
                        {it.value}
                      </Text>
                    </DragHandle>
                  )}
                  <View style={[styles.rule, it.value === 0 && styles.ruleZero]} />
                  {it.value === 0 && <Text style={styles.unratedLabel}>{t(language, 'ladder.unrated')}</Text>}
                </View>
              );
            }
            const card = bySlug[it.slug];
            if (!card) return <View key={key} style={{ height: CARD_H }} />;
            const isChanged = ratings[it.slug] !== base.ratings[it.slug];
            return (
              <View key={key} style={[styles.card, active && styles.cardActive]}>
                <DragHandle id={key} handlers={handlers} label={`${t(language, 'ladder.drag')} ${card.title}`}>
                  <Text style={styles.grip}>⠿</Text>
                </DragHandle>
                <View style={styles.meta}>
                  <Text style={styles.title} numberOfLines={1}>{card.title}</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {card.subtitle}
                    {card.note ? <Text style={styles.note}>{`  ${card.note}`}</Text> : null}
                  </Text>
                </View>
                {isChanged && <View style={styles.dot} />}
              </View>
            );
          })}
        </View>
        {cards.length === 0 && <Text style={styles.empty}>{t(language, 'ladder.empty')}</Text>}
      </ScrollView>
      </View>

      <View style={styles.bar}>
        <Text style={[styles.status, saveState === 'error' && styles.statusError]} numberOfLines={1}>{status}</Text>
        <Pressable
          style={[styles.saveButton, (changed.length === 0 || saveState === 'saving') && styles.saveDisabled]}
          disabled={changed.length === 0 || saveState === 'saving'}
          onPress={save}
          accessibilityRole="button"
        >
          {saveState === 'saving'
            ? <ActivityIndicator size="small" color={colors.bg} />
            : <Text style={styles.saveText}>{t(language, 'ladder.save')}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function makeBase(cards: LadderCard[]) {
  const ratings = Object.fromEntries(cards.map(c => [c.slug, c.rating > 0 ? c.rating : 0]));
  return { ratings, gaps: gapSignature(buildLadder(cards)) };
}

type Handlers = { current: { start: (key: string, y: number) => void; end: () => void; move: (y: number) => void } };

// Ручка, за которую тащат строку: жест не отдаём прокрутке, пока палец не отпущен
function DragHandle({ id, handlers, label, children }: {
  id: string; handlers: Handlers; label: string; children: React.ReactNode;
}) {
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: e => handlers.current.start(id, e.nativeEvent.pageY),
    onPanResponderMove: (_, g) => handlers.current.move(g.moveY),
    onPanResponderRelease: () => handlers.current.end(),
    onPanResponderTerminate: () => handlers.current.end(),
  })).current;
  return (
    <View {...responder.panHandlers} style={[styles.handle, webDrag]} accessibilityLabel={label}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  frame: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 8 },
  line: { height: LINE_H, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.accent },
  ruleShort: { flex: 0, width: 12 },
  ruleZero: { backgroundColor: colors.textFaint },
  handle: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 4 },
  pill: {
    minWidth: 36, textAlign: 'center', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: colors.accent, color: colors.bg, fontWeight: '700', fontSize: 14,
  },
  pillFixed: { opacity: 0.8 },
  pillZero: { backgroundColor: colors.textFaint },
  pillActive: { transform: [{ scale: 1.12 }] },
  unratedLabel: { fontSize: 12, color: colors.textFaint },
  card: {
    height: CARD_H, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderBottomWidth: 1, borderBottomColor: colors.borderFaint, backgroundColor: colors.bg,
  },
  cardActive: {
    backgroundColor: colors.bgInput, borderRadius: 8, borderBottomColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  grip: { fontSize: 20, color: colors.textFaint, paddingHorizontal: 6 },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 13, color: colors.textMuted },
  note: { fontStyle: 'italic' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginRight: 6 },
  empty: { textAlign: 'center', marginTop: 24, color: colors.textFaint, fontSize: 15 },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg,
  },
  status: { flex: 1, fontSize: 14, color: colors.textMuted },
  statusError: { color: '#b3261e' },
  saveButton: {
    minWidth: 110, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 8, backgroundColor: colors.accent,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: colors.bg, fontWeight: '600', fontSize: 15 },
});
