// Карточка «события по названию»: театр (мюзикл, спектакль, опера, балет), выставка или лекция.
// Оба раздела устроены одинаково, отличаются папкой, видами и парой полей (см. utils/eventSections.ts).
export interface EventFormData {
  slug: string;           // имя файла без .md — не хранится во фронтматтере
  kind: string;           // вид внутри раздела: musical, play… (у выставок и лекций один вид)
  title: string;          // как называл пользователь, без поиска перевода
  original_title: string; // только театр и только если отличается
  author: string;         // композитор/драматург, художник или лектор
  company: string;        // только театр: труппа, театр или тур
  venue: string;          // «Площадка, Город»
  link: string;           // страница постановки или выставки, '' если нет
  tags: string[];
  rating: number;         // 0 = не задан, 1–10
  date_attended: string;  // ISO YYYY-MM-DD, YYYY или ''
  summary: string;
  review: string;
}

export const emptyEvent: EventFormData = {
  slug: '',
  kind: '',
  title: '',
  original_title: '',
  author: '',
  company: '',
  venue: '',
  link: '',
  tags: [],
  rating: 0,
  date_attended: '',
  summary: '',
  review: '',
};
