export interface TravelPlaceAlias {
  readonly keywords: readonly string[];
  readonly sido: string;
  readonly sigungu: string;
  readonly dong: string;
  readonly searchKeywords: readonly string[];
  readonly sidoCd?: string | null;
  readonly gugunCd?: string | null;
}

export interface ResolvedSearchLocation {
  originalInput: string;
  displayName: string;
  resolvedSido: string;
  resolvedSigungu: string;
  resolvedDong: string;
  sidoCd: string | null;
  gugunCd: string | null;
  keywords: string[];
  source: 'alias' | 'admin-region';
}

const ADMIN_REGION_KEYWORDS = [
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
  '수원',
  '강릉',
  '속초',
  '여수',
  '전주',
  '경주',
  '통영',
  '남해',
  '순천',
  '포항',
  '제천',
  '춘천',
  '목포',
  '군산',
  '보령',
  '태안',
] as const;

const adminRegionAliases: readonly TravelPlaceAlias[] = [
  {
    keywords: ['서울', '서울특별시'],
    sido: '서울특별시',
    sigungu: '',
    dong: '',
    searchKeywords: ['서울', '서울특별시'],
    sidoCd: '11',
  },
  {
    keywords: ['부산', '부산광역시'],
    sido: '부산광역시',
    sigungu: '',
    dong: '',
    searchKeywords: ['부산', '부산광역시'],
    sidoCd: '26',
  },
  {
    keywords: ['대구', '대구광역시'],
    sido: '대구광역시',
    sigungu: '',
    dong: '',
    searchKeywords: ['대구', '대구광역시'],
  },
  {
    keywords: ['인천', '인천광역시'],
    sido: '인천광역시',
    sigungu: '',
    dong: '',
    searchKeywords: ['인천', '인천광역시'],
  },
  {
    keywords: ['광주', '광주광역시'],
    sido: '광주광역시',
    sigungu: '',
    dong: '',
    searchKeywords: ['광주', '광주광역시'],
  },
  {
    keywords: ['대전', '대전광역시'],
    sido: '대전광역시',
    sigungu: '',
    dong: '',
    searchKeywords: ['대전', '대전광역시'],
  },
  {
    keywords: ['울산', '울산광역시'],
    sido: '울산광역시',
    sigungu: '',
    dong: '',
    searchKeywords: ['울산', '울산광역시'],
  },
  {
    keywords: ['세종', '세종특별자치시'],
    sido: '세종특별자치시',
    sigungu: '',
    dong: '',
    searchKeywords: ['세종', '세종특별자치시'],
  },
  {
    keywords: ['경기', '경기도'],
    sido: '경기도',
    sigungu: '',
    dong: '',
    searchKeywords: ['경기', '경기도'],
  },
  {
    keywords: ['강원', '강원도', '강원특별자치도'],
    sido: '강원특별자치도',
    sigungu: '',
    dong: '',
    searchKeywords: ['강원', '강원특별자치도'],
    sidoCd: '42',
  },
  {
    keywords: ['충북', '충청북도'],
    sido: '충청북도',
    sigungu: '',
    dong: '',
    searchKeywords: ['충북', '충청북도'],
  },
  {
    keywords: ['충남', '충청남도'],
    sido: '충청남도',
    sigungu: '',
    dong: '',
    searchKeywords: ['충남', '충청남도'],
  },
  {
    keywords: ['전북', '전라북도', '전북특별자치도'],
    sido: '전북특별자치도',
    sigungu: '',
    dong: '',
    searchKeywords: ['전북', '전북특별자치도'],
  },
  {
    keywords: ['전남', '전라남도'],
    sido: '전라남도',
    sigungu: '',
    dong: '',
    searchKeywords: ['전남', '전라남도'],
  },
  {
    keywords: ['경북', '경상북도'],
    sido: '경상북도',
    sigungu: '',
    dong: '',
    searchKeywords: ['경북', '경상북도'],
  },
  {
    keywords: ['경남', '경상남도'],
    sido: '경상남도',
    sigungu: '',
    dong: '',
    searchKeywords: ['경남', '경상남도'],
  },
  {
    keywords: ['제주', '제주도', '제주특별자치도'],
    sido: '제주특별자치도',
    sigungu: '',
    dong: '',
    searchKeywords: ['제주', '제주특별자치도', '제주시', '서귀포'],
    sidoCd: '50',
  },
  {
    keywords: ['수원', '수원시'],
    sido: '경기도',
    sigungu: '수원시',
    dong: '',
    searchKeywords: ['수원', '수원시', '경기'],
  },
  {
    keywords: ['강릉', '강릉시'],
    sido: '강원특별자치도',
    sigungu: '강릉시',
    dong: '',
    searchKeywords: ['강릉', '강릉시', '강원'],
    sidoCd: '42',
    gugunCd: '42150',
  },
  {
    keywords: ['속초', '속초시'],
    sido: '강원특별자치도',
    sigungu: '속초시',
    dong: '',
    searchKeywords: ['속초', '속초시', '강원'],
  },
  {
    keywords: ['여수', '여수시'],
    sido: '전라남도',
    sigungu: '여수시',
    dong: '',
    searchKeywords: ['여수', '여수시', '전남'],
  },
  {
    keywords: ['전주', '전주시'],
    sido: '전북특별자치도',
    sigungu: '전주시',
    dong: '',
    searchKeywords: ['전주', '전주시', '전북'],
  },
  {
    keywords: ['경주', '경주시'],
    sido: '경상북도',
    sigungu: '경주시',
    dong: '',
    searchKeywords: ['경주', '경주시', '경북'],
  },
  {
    keywords: ['통영', '통영시'],
    sido: '경상남도',
    sigungu: '통영시',
    dong: '',
    searchKeywords: ['통영', '통영시', '경남'],
  },
  {
    keywords: ['남해', '남해군'],
    sido: '경상남도',
    sigungu: '남해군',
    dong: '',
    searchKeywords: ['남해', '남해군', '경남'],
  },
  {
    keywords: ['순천', '순천시'],
    sido: '전라남도',
    sigungu: '순천시',
    dong: '',
    searchKeywords: ['순천', '순천시', '전남'],
  },
  {
    keywords: ['포항', '포항시'],
    sido: '경상북도',
    sigungu: '포항시',
    dong: '',
    searchKeywords: ['포항', '포항시', '경북'],
  },
  {
    keywords: ['제천', '제천시'],
    sido: '충청북도',
    sigungu: '제천시',
    dong: '',
    searchKeywords: ['제천', '제천시', '충북'],
  },
  {
    keywords: ['춘천', '춘천시'],
    sido: '강원특별자치도',
    sigungu: '춘천시',
    dong: '',
    searchKeywords: ['춘천', '춘천시', '강원'],
  },
  {
    keywords: ['목포', '목포시'],
    sido: '전라남도',
    sigungu: '목포시',
    dong: '',
    searchKeywords: ['목포', '목포시', '전남'],
  },
  {
    keywords: ['군산', '군산시'],
    sido: '전북특별자치도',
    sigungu: '군산시',
    dong: '',
    searchKeywords: ['군산', '군산시', '전북'],
  },
  {
    keywords: ['보령', '보령시'],
    sido: '충청남도',
    sigungu: '보령시',
    dong: '',
    searchKeywords: ['보령', '보령시', '충남'],
  },
  {
    keywords: ['태안', '태안군'],
    sido: '충청남도',
    sigungu: '태안군',
    dong: '',
    searchKeywords: ['태안', '태안군', '충남'],
  },
] as const;

export const travelPlaceAliases: readonly TravelPlaceAlias[] = [
  {
    keywords: ['부산 수영구', '수영구'],
    sido: '부산광역시',
    sigungu: '수영구',
    dong: '',
    searchKeywords: ['부산 수영구', '수영구', '부산'],
  },
  {
    keywords: ['제주 제주시', '제주시'],
    sido: '제주특별자치도',
    sigungu: '제주시',
    dong: '',
    searchKeywords: ['제주 제주시', '제주시', '제주'],
  },
  {
    keywords: ['서울 마포구', '마포구'],
    sido: '서울특별시',
    sigungu: '마포구',
    dong: '',
    searchKeywords: ['서울 마포구', '마포구', '서울'],
  },
  {
    keywords: ['광안리', '광안리해수욕장'],
    sido: '부산광역시',
    sigungu: '수영구',
    dong: '광안동',
    searchKeywords: ['광안리', '광안동', '수영구', '부산'],
    sidoCd: '26',
    gugunCd: '26740',
  },
  {
    keywords: ['해운대', '해운대해수욕장'],
    sido: '부산광역시',
    sigungu: '해운대구',
    dong: '우동',
    searchKeywords: ['해운대', '우동', '해운대구', '부산'],
    sidoCd: '26',
    gugunCd: '26350',
  },
  {
    keywords: ['애월', '제주 애월', '애월읍', '곽지', '곽지해수욕장'],
    sido: '제주특별자치도',
    sigungu: '제주시',
    dong: '애월읍',
    searchKeywords: ['애월', '애월읍', '제주시', '제주', '곽지'],
    sidoCd: '50',
    gugunCd: '50110',
  },
  {
    keywords: ['성산', '성산일출봉', '성산읍'],
    sido: '제주특별자치도',
    sigungu: '서귀포시',
    dong: '성산읍',
    searchKeywords: ['성산', '성산읍', '성산일출봉', '서귀포', '제주'],
    sidoCd: '50',
    gugunCd: '50130',
  },
  {
    keywords: ['안목해변', '강릉 안목', '안목커피거리'],
    sido: '강원특별자치도',
    sigungu: '강릉시',
    dong: '견소동',
    searchKeywords: ['안목', '견소동', '강릉', '강원'],
    sidoCd: '42',
    gugunCd: '42150',
  },
] as const;

const toResolvedSearchLocation = (
  alias: TravelPlaceAlias,
  originalInput: string,
  source: ResolvedSearchLocation['source'],
): ResolvedSearchLocation => ({
  originalInput,
  displayName: originalInput,
  resolvedSido: alias.sido,
  resolvedSigungu: alias.sigungu,
  resolvedDong: alias.dong,
  sidoCd: alias.sidoCd ?? null,
  gugunCd: alias.gugunCd ?? null,
  keywords: [...alias.searchKeywords],
  source,
});

export function resolveSearchLocation(input: string): ResolvedSearchLocation | null {
  const normalized = input.trim();
  if (!normalized) return null;

  const normalizedLower = normalized.toLowerCase();

  const exactAlias = travelPlaceAliases.find((alias) =>
    alias.keywords.some((keyword) => keyword.toLowerCase() === normalizedLower)
  );

  if (exactAlias) {
    return toResolvedSearchLocation(exactAlias, normalized, 'alias');
  }

  const exactAdminRegion = adminRegionAliases.find((alias) =>
    alias.keywords.some((keyword) => keyword.toLowerCase() === normalizedLower)
  );

  if (exactAdminRegion) {
    return toResolvedSearchLocation(exactAdminRegion, normalized, 'admin-region');
  }

  const isProtectedAdminRegion = ADMIN_REGION_KEYWORDS.some(
    (keyword) => keyword.toLowerCase() === normalizedLower,
  );

  if (isProtectedAdminRegion) {
    return null;
  }

  const partialAlias = travelPlaceAliases.find((alias) =>
    alias.keywords.some((keyword) => {
      const keywordLower = keyword.toLowerCase();
      return normalizedLower.length >= keywordLower.length && normalizedLower.startsWith(keywordLower);
    })
  );

  if (!partialAlias) return null;

  return toResolvedSearchLocation(partialAlias, normalized, 'alias');
}

export function getAliasAutocompleteItems(input: string): string[] {
  const normalizedLower = input.trim().toLowerCase();
  if (!normalizedLower) return [];

  const results: string[] = [];
  for (const alias of travelPlaceAliases) {
    for (const keyword of alias.keywords) {
      if (keyword.toLowerCase().includes(normalizedLower) && !results.includes(keyword)) {
        results.push(keyword);
      }
    }
  }
  return results;
}
