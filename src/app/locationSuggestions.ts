export const locationSuggestions = ['광안리', '안목해변', '애월', '성산일출봉', '해운대', '여수', '통영'];

export const locationDiscoverySections = [
  {
    title: '최근 검색',
    items: ['광안리', '안목해변', '제주 애월'],
  },
  {
    title: '추천 지역',
    items: ['부산 수영구', '강릉 안목', '제주 서쪽'],
  },
] as const;

export const filterLocationSuggestions = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return [];

  return locationSuggestions.filter((location) => location.toLowerCase().includes(normalizedQuery));
};
