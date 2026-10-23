export type BookMedia = 'бумажная' | 'электронная' | 'аудио' | '';

export interface BookFormData {
  slug: string;          // имя файла без .md — не хранится во фронтматтере
  title: string;
  original_title: string;
  author: string;
  year: string;
  original_language: string;
  media: BookMedia;
  source: string;
  tags: string[];
  rating: number; // 0 = не задан, 1–10
  summary: string;
  review: string;
  date_started: string;  // ISO YYYY-MM-DD или ''
  date_finished: string; // ISO YYYY-MM-DD или ''
  date_abandoned: string; // ISO YYYY-MM-DD или '' — книга брошена
  abandoned_at: string;   // где бросил, свободный текст (например, «30%») или ''
}

export const emptyBook: BookFormData = {
  slug: '',
  title: '',
  original_title: '',
  author: '',
  year: '',
  original_language: 'ru',
  media: '',
  source: '',
  tags: [],
  rating: 0,
  summary: '',
  review: '',
  date_started: '',
  date_finished: '',
  date_abandoned: '',
  abandoned_at: '',
};
