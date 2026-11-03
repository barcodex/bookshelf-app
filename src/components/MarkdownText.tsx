import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/theme';

interface Props {
  text: string;
}

type Block =
  | { type: 'heading'; level: 2 | 3; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; content: string }
  | { type: 'table'; header: string[]; align: Align[]; rows: string[][] };

type Align = 'left' | 'center' | 'right';

const TABLE_SEPARATOR = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/;

// Splits a GFM table row into cells: drops the outer pipes, keeps `\|` as a literal pipe.
function splitRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '\\' && row[i + 1] === '|') {
      current += '|';
      i++;
    } else if (row[i] === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += row[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseAlign(cell: string): Align {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  return 'left';
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') });
      paragraphLines = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading3 = line.match(/^###\s+(.+)/);
    const heading2 = !heading3 && line.match(/^##\s+(.+)/);
    const listItem = line.match(/^(?:[-*]|\d+\.)\s+(.+)/);

    const next = lines[index + 1]?.trim() ?? '';
    if (line.includes('|') && TABLE_SEPARATOR.test(next) && next.includes('-')) {
      const header = splitRow(line);
      const separator = splitRow(next);
      if (separator.length === header.length) {
        flushParagraph();
        flushList();
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
          const cells = splitRow(lines[index]);
          rows.push(header.map((_, c) => cells[c] ?? ''));
          index++;
        }
        index--;
        blocks.push({ type: 'table', header, align: separator.map(parseAlign), rows });
        continue;
      }
    }

    if (heading3) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: 3, content: heading3[1] });
    } else if (heading2) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: 2, content: heading2[1] });
    } else if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushList();

  return blocks;
}

function renderInline(line: string, keyPrefix: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    const bold = part.startsWith('**') && part.endsWith('**');
    return (
      <Text key={`${keyPrefix}-${i}`} style={bold ? styles.bold : undefined}>
        {bold ? part.slice(2, -2) : part}
      </Text>
    );
  });
}

const SHORT_COLUMN_MIN = 100;
const LONG_COLUMN_MIN = 180;
const LONG_COLUMN_CHARS = 30;

// Width hints from the average text length of each column, so a short «Статус»
// column doesn't get as much room as a long «Комментарий».
function columnStats(header: string[], rows: string[][]) {
  return header.map((h, c) => {
    const cells = [h, ...rows.map((r) => r[c])];
    const avg = cells.reduce((sum, cell) => sum + cell.length, 0) / cells.length;
    return {
      weight: Math.min(Math.max(avg, 8), 80),
      min: avg > LONG_COLUMN_CHARS ? LONG_COLUMN_MIN : SHORT_COLUMN_MIN,
    };
  });
}

// Splits `total` proportionally to weights, but never below each column's minimum.
function columnWidths(stats: { weight: number; min: number }[], total: number): number[] {
  const widths: (number | null)[] = stats.map(() => null);
  for (;;) {
    const free = stats.filter((_, i) => widths[i] === null);
    const fixed = widths.reduce<number>((sum, w) => sum + (w ?? 0), 0);
    const weight = free.reduce((sum, s) => sum + s.weight, 0);
    const room = total - fixed;
    const tooNarrow = stats.findIndex(
      (s, i) => widths[i] === null && (room * s.weight) / weight < s.min,
    );
    if (tooNarrow === -1) {
      return stats.map((s, i) => widths[i] ?? (room * s.weight) / weight);
    }
    widths[tooNarrow] = stats[tooNarrow].min;
  }
}

function MarkdownTable({ header, align, rows, keyPrefix }: {
  header: string[];
  align: Align[];
  rows: string[][];
  keyPrefix: string;
}) {
  const [available, setAvailable] = useState(0);
  const stats = columnStats(header, rows);
  // Fit the container when possible; on narrow screens widen the table and let it
  // scroll horizontally instead of squeezing every column into a sliver.
  const tableWidth = Math.max(available, stats.reduce((sum, s) => sum + s.min, 0));
  const widths = columnWidths(stats, tableWidth);

  const renderRow = (cells: string[], r: number, isHeader: boolean) => (
    <View
      key={r}
      style={[styles.tableRow, isHeader && styles.tableHeaderRow, r === rows.length - 1 && !isHeader && styles.tableLastRow]}
    >
      {cells.map((cell, c) => (
        <View
          key={c}
          style={[styles.tableCell, { width: widths[c] }, c === cells.length - 1 && styles.tableLastCell]}
        >
          <Text style={[styles.tableText, isHeader && styles.bold, { textAlign: align[c] }]}>
            {renderInline(cell, `${keyPrefix}-${isHeader ? 'h' : r}-${c}`)}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View onLayout={(e) => setAvailable(Math.floor(e.nativeEvent.layout.width))}>
      {available > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={tableWidth > available} bounces={false}>
          <View style={[styles.table, { width: tableWidth }]}>
            {renderRow(header, -1, true)}
            {rows.map((row, r) => renderRow(row, r, false))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

export default function MarkdownText({ text }: Props) {
  const blocks = parseBlocks(text);

  return (
    <View style={styles.container}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <Text key={i} style={block.level === 2 ? styles.heading2 : styles.heading3}>
              {renderInline(block.content, `h-${i}`)}
            </Text>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={i} style={styles.list}>
              {block.items.map((item, j) => (
                <View key={j} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.paragraph}>{renderInline(item, `li-${i}-${j}`)}</Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'table') {
          return <MarkdownTable key={i} {...block} keyPrefix={`t-${i}`} />;
        }

        return (
          <Text key={i} style={styles.paragraph}>
            {renderInline(block.content, `p-${i}`)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  paragraph: { fontSize: 15, color: '#222', lineHeight: 22 },
  heading2: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 4 },
  heading3: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 4 },
  bold: { fontWeight: '700' },
  list: { gap: 4 },
  listItem: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 15, color: '#222', lineHeight: 22 },
  table: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 6, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tableHeaderRow: { backgroundColor: colors.bgInput },
  tableLastRow: { borderBottomWidth: 0 },
  tableCell: { paddingHorizontal: 8, paddingVertical: 6, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
  tableLastCell: { borderRightWidth: 0 },
  tableText: { fontSize: 14, color: '#222', lineHeight: 20 },
});
