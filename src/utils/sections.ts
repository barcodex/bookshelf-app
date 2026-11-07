// Разделы культурного дневника. Работают все, кроме сериалов — они «скоро».
export type SectionId = 'books' | 'films' | 'series' | 'theatre' | 'exhibitions' | 'concerts';

export interface SectionDef {
  id: SectionId;
  color: string;
  available: boolean;
}

export const sections: SectionDef[] = [
  { id: 'books',       color: '#8b4513', available: true },
  { id: 'films',       color: '#2a4d80', available: true },
  { id: 'series',      color: '#6b3fa0', available: false },
  { id: 'theatre',     color: '#b07a1a', available: true },
  { id: 'exhibitions', color: '#2f7a55', available: true },
  { id: 'concerts',    color: '#b23a48', available: true },
];

export function sectionColor(id: SectionId): string {
  return sections.find(s => s.id === id)!.color;
}
