import { useEffect, useState } from 'react';
import { Image, ImageStyle, Pressable, StyleProp, View } from 'react-native';
import { imagePath, imageUrl } from '../services/images';

interface Props {
  folder: string;
  slug: string;
  name: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
  onPress?: () => void;
}

// Картинка карточки из репозитория (или ещё не сохранённая из формы)
export default function RepoImage({ folder, slug, name, style, resizeMode = 'cover', onPress }: Props) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUri(null);
    imageUrl(imagePath(folder, slug, name), name)
      .then(u => { if (alive) setUri(u); })
      .catch(() => {});
    return () => { alive = false; };
  }, [folder, slug, name]);

  const content = uri
    ? <Image source={{ uri }} style={style} resizeMode={resizeMode} />
    : <View style={[style as any, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
