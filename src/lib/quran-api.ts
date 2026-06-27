// API для загрузки сур Корана из Quran.com

const QURAN_API = "https://api.quran.com/api/v4";

export type Surah = {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  revelationPlace: string;
  versesCount: number;
};

export type Verse = {
  id: number;
  verseNumber: number;
  textUthmani: string;
  translations: {
    id: number;
    text: string;
    resourceName: string;
  }[];
};

export async function fetchSurahs(): Promise<Surah[]> {
  const res = await fetch(`${QURAN_API}/chapters?language=ru`);
  const data = await res.json();
  return data.chapters.map((ch: any) => ({
    id: ch.id,
    name: ch.name_arabic,
    transliteration: ch.name_simple,
    translation: ch.translated_name.name,
    revelationPlace: ch.revelation_place,
    versesCount: ch.verses_count,
  }));
}

export async function fetchVerses(surahId: number, translationId = 85): Promise<Verse[]> {
  const res = await fetch(
    `${QURAN_API}/verses/by_chapter/${surahId}?language=ru&words=false&translations=${translationId}&fields=text_uthmani`
  );
  const data = await res.json();
  return data.verses.map((v: any) => ({
    id: v.id,
    verseNumber: v.verse_number,
    textUthmani: v.text_uthmani,
    translations: v.translations.map((t: any) => ({
      id: t.resource_id,
      text: t.text,
      resourceName: t.resource_name,
    })),
  }));
}

export async function loadQuranToDatabase() {
  const surahs = await fetchSurahs();
  // Вызывается из API route для загрузки в БД
  return surahs;
}
