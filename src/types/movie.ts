export interface MovieFormData {
  slug: string;           // имя файла без .md — не хранится во фронтматтере
  title: string;
  original_title: string; // только если отличается от title
  director: string;
  year: string;
  imdb: string;           // ссылка на страницу фильма в IMDb или ''
  tags: string[];
  rating: number;         // 0 = не задан, 1–10; у недосмотренного всегда 0
  abandoned: boolean;     // «не досмотрено» — исключает оценку
  date_watched: string;   // ISO YYYY-MM-DD, YYYY или ''
  summary: string;
  review: string;
}

export const emptyMovie: MovieFormData = {
  slug: '',
  title: '',
  original_title: '',
  director: '',
  year: '',
  imdb: '',
  tags: [],
  rating: 0,
  abandoned: false,
  date_watched: '',
  summary: '',
  review: '',
};
