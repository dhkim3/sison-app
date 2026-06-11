export type ActivityImageType =
  | 'beach-cleanup'
  | 'forest-trail'
  | 'festival-event'
  | 'city-travel'
  | 'education-culture'
  | 'rural-village'
  | 'care-community'
  | 'office-campaign'
  | 'default-travel';

export interface ActivityImageInput {
  id?: string;
  progrmRegistNo?: string;
  imageUrl?: string | null;
  title?: string | null;
  category?: string | null;
  volunteerCategory?: string | null;
  volunteerField?: string | null;
  location?: string | null;
  organization?: string | null;
  recruitingOrganization?: string | null;
  description?: string | null;
  volunteerTarget?: string | null;
}

export interface ResolvedActivityImage {
  imageUrl: string;
  imageType: ActivityImageType;
  imageReason: string;
}

const ACTIVITY_IMAGE_SETS: Record<ActivityImageType, string[]> = {
  'beach-cleanup': [
    '/activity-images/beach-cleanup-1.png',
    '/activity-images/beach-cleanup-2.png',
  ],
  'forest-trail': [
    '/activity-images/forest-trail-1.png',
    '/activity-images/forest-trail-2.png',
  ],
  'festival-event': [
    '/activity-images/festival-event-1.png',
    '/activity-images/festival-event-2.png',
  ],
  'city-travel': [
    '/activity-images/city-travel-1.png',
    '/activity-images/city-travel-2.png',
  ],
  'education-culture': [
    '/activity-images/education-culture-1.png',
  ],
  'rural-village': [
    '/activity-images/default-travel-1.png',
  ],
  'care-community': [
    '/activity-images/care-community-1.png',
  ],
  'office-campaign': [
    '/activity-images/office-campaign-1.png',
  ],
  'default-travel': [
    '/activity-images/default-travel-1.png',
    '/activity-images/default-travel-2.png',
  ],
};

const FALLBACK_IMAGE_MARKERS = [
  'photo-1565803974275-dccd2f933cbb',
  'photo-1491438590914-bc09fcaaf77a',
  'photo-1523906834658-6e24ef2386f9',
  'photo-1584515933487-779824d29309',
  'photo-1533174072545-7a4b6ad7a6c3',
  'photo-1507525428034-b723cf961d3e',
  'photo-1448375240586-882707db888b',
  'photo-1519010470956-6d877008eaa4',
  'photo-1500530855697-b586d89ba3ee',
  'photo-1775116259654-404b3376c02e',
  'photo-1610093674388-cee0337f2684',
  'photo-1636625093308-e29128dbbc08',
];

const IMAGE_RULES: Array<{ type: ActivityImageType; keywords: string[]; reason: string }> = [
  {
    type: 'beach-cleanup',
    reason: '해변/바다/환경정화 키워드',
    keywords: ['해변', '바다', '해수욕장', '플로깅', '쓰레기', '정화', '환경정화', '해양', '연안', '방파제'],
  },
  {
    type: 'festival-event',
    reason: '축제/행사/공연 키워드',
    keywords: ['축제', '행사', '페스티벌', '공연', '문화제', '마을축제', '지역축제', '운영지원', '행사운영', '무대', '관람', '안내'],
  },
  {
    type: 'forest-trail',
    reason: '숲/산/공원/산책로 키워드',
    keywords: ['숲', '산', '산책로', '둘레길', '공원', '숲길', '정원', '수목원', '올레길', '탐방로'],
  },
  {
    type: 'city-travel',
    reason: '도시/관광/시장 키워드',
    keywords: ['관광', '안내', '투어', '거리', '골목', '시장', '전통시장', '광장', '도시', '마을', '플리마켓', '마켓'],
  },
  {
    type: 'rural-village',
    reason: '농어촌/마을/정리 키워드',
    keywords: ['농촌', '어촌', '농어촌', '마을', '농장', '텃밭', '수확', '정리', '일손', '봉사단'],
  },
  {
    type: 'education-culture',
    reason: '교육/도서관/체험 키워드',
    keywords: ['도서관', '리딩', '독서', '교육', '체험', '체험부스', '수업', '프로그램', '어린이', '아동'],
  },
  {
    type: 'care-community',
    reason: '복지/돌봄/센터 키워드',
    keywords: ['복지', '돌봄', '어르신', '노인', '장애', '센터', '요양', '치매', '보호센터'],
  },
  {
    type: 'office-campaign',
    reason: '사무/행정/캠페인 키워드',
    keywords: ['사무', '행정', '캠페인', '홍보', '접수', '분류', '자료', '안내데스크'],
  },
];

const stableHash = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const isFallbackImage = (imageUrl?: string | null) => {
  if (!imageUrl) return true;
  if (imageUrl.startsWith('/home-hero-')) return true;

  return FALLBACK_IMAGE_MARKERS.some((marker) => imageUrl.includes(marker));
};

const buildActivityText = (activity: ActivityImageInput) =>
  [
    activity.title,
    activity.category,
    activity.volunteerCategory,
    activity.volunteerField,
    activity.location,
    activity.organization,
    activity.recruitingOrganization,
    activity.description,
    activity.volunteerTarget,
  ]
    .filter(Boolean)
    .join(' ');

const pickImage = (type: ActivityImageType, activity: ActivityImageInput) => {
  const imageSet = ACTIVITY_IMAGE_SETS[type];
  const key = activity.id || activity.progrmRegistNo || activity.title || buildActivityText(activity) || type;
  return imageSet[stableHash(key) % imageSet.length];
};

export const resolveActivityImage = (activity: ActivityImageInput): ResolvedActivityImage => {
  if (!isFallbackImage(activity.imageUrl)) {
    return {
      imageUrl: activity.imageUrl!,
      imageType: 'default-travel',
      imageReason: '기존 imageUrl 유지',
    };
  }

  const text = buildActivityText(activity);
  const matchedRule = IMAGE_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  const imageType = matchedRule?.type ?? 'default-travel';

  return {
    imageUrl: pickImage(imageType, activity),
    imageType,
    imageReason: matchedRule?.reason ?? '기본 여행 이미지',
  };
};

export const withResolvedActivityImage = <T extends ActivityImageInput>(activity: T): T => {
  const resolved = resolveActivityImage(activity);
  return {
    ...activity,
    imageUrl: resolved.imageUrl,
    imageType: resolved.imageType,
    imageReason: resolved.imageReason,
  };
};

export const logActivityImageMappings = (label: string, activities: ActivityImageInput[]) => {
  void label;
  void activities;
};
