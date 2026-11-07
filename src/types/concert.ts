export type ConcertKind = 'concert' | 'standup';

export interface ConcertFormData {
  slug: string;           // имя файла без .md — не хранится во фронтматтере
  kind: ConcertKind;      // во фронтматтере только kind: standup, обычный концерт без поля
  artist: string;         // хедлайнер
  support: string[];      // разогрев, может быть несколько групп
  venue: string;          // площадка и город: «Unibet Arena, Tallinn»
  spotify: string;        // ссылка на артиста в Spotify или ''
  tags: string[];
  rating: number;         // 0 = не задан, 1–10
  date_attended: string;  // ISO YYYY-MM-DD, YYYY или ''
  summary: string;
  review: string;
}

export const emptyConcert: ConcertFormData = {
  slug: '',
  kind: 'concert',
  artist: '',
  support: [],
  venue: '',
  spotify: '',
  tags: [],
  rating: 0,
  date_attended: '',
  summary: '',
  review: '',
};
