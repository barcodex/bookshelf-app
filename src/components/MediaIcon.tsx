import React from 'react';
import { SvgXml } from 'react-native-svg';

type MediaType = 'бумажная' | 'электронная' | 'аудио';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  media: MediaType;
  size?: Size;
  color?: string;
}

const sizeMap: Record<Size, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

const iconMap: Record<MediaType, string> = {
  бумажная: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V4C22 2.9 21.1 2 20 2H4ZM4 4H12V20H4V4ZM20 4V20H14V4H20ZM12 6H18V8H12V6ZM12 10H18V12H12V10ZM12 14H18V16H12V14ZM6 6H10V8H6V6ZM6 10H10V12H6V10ZM6 14H10V16H6V14Z" fill="currentColor"/>
  </svg>`,

  электронная: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2C2.9 2 2 2.9 2 4V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V4C22 2.9 21.1 2 20 2H4ZM4 4H20V16H4V4ZM4 18H20V18H4V18ZM6 6V14H18V6H6Z" fill="currentColor"/>
  </svg>`,

  аудио: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1C6.48 1 2 5.48 2 11C2 16.52 6.48 21 12 21C17.52 21 22 16.52 22 11C22 5.48 17.52 1 12 1ZM12 3C16.41 3 20 6.59 20 11C20 15.41 16.41 19 12 19C7.59 19 4 15.41 4 11C4 6.59 7.59 3 12 3ZM11 7V15L16 11L11 7Z" fill="currentColor"/>
  </svg>`,
};

export default function MediaIcon({ media, size = 'md', color = '#111' }: Props) {
  const dimension = sizeMap[size];
  const svg = iconMap[media].replace('currentColor', color);

  return <SvgXml xml={svg} width={dimension} height={dimension} />;
}

export { MediaType, Size };
