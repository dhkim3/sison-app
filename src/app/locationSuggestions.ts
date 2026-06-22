import { travelPlaceAliases } from './travelPlaceAliases';

export const locationSuggestions = [
  '서울',
  '부산',
  '제주',
  '강릉',
  '경주',
  '여수',
  '전주',
  '속초',
  '통영',
  '춘천',
  '포항',
  '목포',
  '군산',
  '안동',
  '대전',
  '인천',
  '대구',
  '광주',
  '울산',
  '수원',
];

// Primary display name for each travel place alias entry
const aliasDisplayNames: readonly string[] = travelPlaceAliases.map((alias) => alias.keywords[0]);

export function getSearchSuggestions(query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const exact: string[] = [];
  const startsWith: string[] = [];
  const partial: string[] = [];
  const seen = new Set<string>();

  const addItem = (display: string) => {
    if (seen.has(display)) return;
    seen.add(display);
    const lower = display.toLowerCase();
    if (lower === normalizedQuery) exact.push(display);
    else if (lower.startsWith(normalizedQuery)) startsWith.push(display);
    else if (lower.includes(normalizedQuery)) partial.push(display);
  };

  for (const name of locationSuggestions) addItem(name);
  for (const name of aliasDisplayNames) addItem(name);

  return [...exact, ...startsWith, ...partial].slice(0, 5);
}

export const filterLocationSuggestions = (query: string) => getSearchSuggestions(query);
