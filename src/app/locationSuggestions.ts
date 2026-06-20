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

export const filterLocationSuggestions = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return locationSuggestions
    .filter((location) => location.toLowerCase().includes(normalizedQuery))
    .slice(0, 5);
};
