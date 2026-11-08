import { createCardCache } from '../services/cardCache';
import { Collection } from '../services/cardsService';
import { EventSchema, parseEvent, serializeEvent } from '../services/eventMarkdown';
import { Language, t } from '../services/i18n';
import { EventFormData, emptyEvent } from '../types/event';

// Раздел с карточками-событиями: папка, виды, набор полей и префикс переводов
export interface EventSection {
  id: 'theatre' | 'exhibitions' | 'lectures';
  i18n: string;                       // 'theatre' | 'exhibition' | 'lecture' в locales/*.json
  schema: EventSchema;
  collection: Collection<EventFormData>;
}

function makeSection(id: EventSection['id'], folder: string, i18n: string, schema: EventSchema): EventSection {
  const empty = { ...emptyEvent, kind: schema.kinds[0] };
  return {
    id,
    i18n,
    schema,
    collection: {
      folder,
      parse: (raw, slug) => parseEvent(schema, raw, slug),
      serialize: item => serializeEvent(schema, item),
      cache: createCardCache<EventFormData>(`bookshelf_${folder}_cache`, `bookshelf_${folder}_commit_sha`, empty),
    },
  };
}

export const theatreSection = makeSection('theatre', 'theatre', 'theatre', {
  kinds: ['musical', 'play', 'opera', 'ballet'],
  originalTitle: true,
  company: true,
});

export const exhibitionsSection = makeSection('exhibitions', 'exhibitions', 'exhibition', {
  kinds: ['exhibition'],
  originalTitle: false,
  company: false,
});

export const lecturesSection = makeSection('lectures', 'lectures', 'lecture', {
  kinds: ['lecture'],
  originalTitle: false,
  company: false,
});

export const eventSections = [theatreSection, exhibitionsSection, lecturesSection];

export const emptyFor = (section: EventSection): EventFormData => ({ ...emptyEvent, kind: section.schema.kinds[0] });

export const kindLabel = (section: EventSection, kind: string, language: Language) =>
  t(language, `${section.i18n}.kind.${kind}`);

export const authorLabel = (section: EventSection, kind: string, language: Language) =>
  t(language, `${section.i18n}.author.${kind}`);

// «Мюзиклы: 2 · Опера: 1» — по видам, в порядке схемы, для лент и итогов года
export function eventCountLabel(section: EventSection, items: EventFormData[], language: Language): string {
  return section.schema.kinds
    .map(kind => [kind, items.filter(i => i.kind === kind).length] as const)
    .filter(([, n]) => n > 0)
    .map(([kind, n]) => `${t(language, `${section.i18n}.kindPlural.${kind}`)}: ${n}`)
    .join(' · ') || `${t(language, `${section.i18n}.total`)}: 0`;
}

// «Мюзикл · Andrew Lloyd Webber · Theater 11, Zürich»; вид пишется, только если их в разделе несколько
export function eventSubtitle(section: EventSection, item: EventFormData, language: Language): string {
  const kind = section.schema.kinds.length > 1 ? kindLabel(section, item.kind, language) : '';
  return [kind, item.author, item.venue].filter(Boolean).join(' · ');
}
