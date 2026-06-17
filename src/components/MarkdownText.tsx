import { StyleSheet, Text, View } from 'react-native';

interface Props {
  text: string;
}

type Block =
  | { type: 'heading'; level: 2 | 3; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; content: string };

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

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading3 = line.match(/^###\s+(.+)/);
    const heading2 = !heading3 && line.match(/^##\s+(.+)/);
    const listItem = line.match(/^(?:[-*]|\d+\.)\s+(.+)/);

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
});
