export type ActivityImageType =
  | 'beach-cleanup'
  | 'forest-trail'
  | 'public-safety'
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
  imageType?: ActivityImageType | string;
  imageReason?: string;
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
    '/activity-images/beach-cleanup-3.png',
  ],
  'forest-trail': [
    '/activity-images/forest-trail-1.png',
    '/activity-images/forest-trail-2.png',
    '/activity-images/forest-trail-3.png',
  ],
  'public-safety': [
    '/activity-images/public-safety-1.png',
    '/activity-images/public-safety-2.png',
  ],
  'festival-event': [
    '/activity-images/festival-event-1.png',
    '/activity-images/festival-event-2.png',
    '/activity-images/festival-event-3.png',
  ],
  'city-travel': [
    '/activity-images/city-travel-1.png',
    '/activity-images/city-travel-2.png',
    '/activity-images/city-travel-3.png',
  ],
  'education-culture': [
    '/activity-images/education-culture-1.png',
    '/activity-images/education-culture-2.png',
    '/activity-images/education-culture-3.png',
    '/activity-images/education-culture-4.png',
  ],
  'rural-village': [
    '/activity-images/rural-village-1.png',
    '/activity-images/rural-village-2.png',
    '/activity-images/rural-village-3.png',
  ],
  'care-community': [
    '/activity-images/care-community-1.png',
    '/activity-images/care-community-2.png',
    '/activity-images/care-community-3.png',
    '/activity-images/care-community-4.png',
  ],
  'office-campaign': [
    '/activity-images/office-campaign-1.png',
    '/activity-images/office-campaign-2.png',
    '/activity-images/office-campaign-3.png',
    '/activity-images/office-campaign-4.png',
  ],
  'default-travel': [
    '/activity-images/default-travel-1.png',
    '/activity-images/default-travel-2.png',
    '/activity-images/default-travel-3.png',
  ],
};

const IMAGE_RULES: Array<{ type: ActivityImageType; keywords: string[]; reason: string }> = [
  {
    type: 'public-safety',
    reason: '행사 안전/질서/동선 안내 키워드',
    keywords: [
      '안전관리',
      '질서',
      '동선',
      '진행보조',
      '진행 보조',
      '안내봉사',
      '안내 봉사',
      '행사보조',
      '행사 보조',
      '운영보조',
      '운영 보조',
      '교통안내',
      '교통 안내',
      '체험부스 안전',
      '관람객 안전',
    ],
  },
  {
    type: 'beach-cleanup',
    reason: '해변/바다/환경정화 키워드',
    keywords: ['해변', '바다', '해수욕장', '플로깅', '쓰레기', '정화', '환경정화', '해양', '연안', '방파제'],
  },
  {
    type: 'care-community',
    reason: '복지/돌봄/커뮤니티 키워드',
    keywords: ['노인복지관', '종합복지관', '복지관', '보호센터', '복지', '돌봄', '어르신', '노인', '장애', '요양', '치매'],
  },
  {
    type: 'rural-village',
    reason: '농어촌/마을/일손 키워드',
    keywords: ['농어촌', '농촌', '어촌', '일손', '수확', '텃밭', '농장', '마을정리', '마을 정리', '마을길', '봉사단'],
  },
  {
    type: 'office-campaign',
    reason: '사무/행정/캠페인 키워드',
    keywords: ['사무', '행정', '캠페인', '홍보', '접수', '분류', '자료', '안내데스크'],
  },
  {
    type: 'festival-event',
    reason: '축제/행사/공연 키워드',
    keywords: ['축제', '행사', '페스티벌', '공연', '문화제', '마을축제', '지역축제', '운영지원', '행사운영', '무대', '관람'],
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
    type: 'education-culture',
    reason: '교육/도서관/체험 키워드',
    keywords: ['도서관', '리딩', '독서', '교육', '체험', '체험부스', '수업', '프로그램', '어린이', '아동'],
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

const isActivityImageType = (value?: string): value is ActivityImageType =>
  Boolean(value && value in ACTIVITY_IMAGE_SETS);

const pickAlternativeImage = (
  type: ActivityImageType,
  currentImageUrl: string,
  activity: ActivityImageInput,
  index: number,
) => {
  const imageSet = ACTIVITY_IMAGE_SETS[type];
  if (imageSet.length <= 1) return currentImageUrl;

  const currentIndex = imageSet.indexOf(currentImageUrl);
  if (currentIndex === -1) return currentImageUrl;

  const key = activity.id || activity.progrmRegistNo || activity.title || buildActivityText(activity) || type;
  const step = 1 + (stableHash(`${key}-${index}`) % (imageSet.length - 1));

  return imageSet[(currentIndex + step) % imageSet.length];
};

const pickUnusedAlternativeImage = (
  type: ActivityImageType,
  currentImageUrl: string,
  activity: ActivityImageInput,
  index: number,
  usedImageUrls: Set<string>,
) => {
  const imageSet = ACTIVITY_IMAGE_SETS[type];
  if (imageSet.length <= 1 || !usedImageUrls.has(currentImageUrl)) return currentImageUrl;

  const key = activity.id || activity.progrmRegistNo || activity.title || buildActivityText(activity) || type;
  const startIndex = stableHash(`${key}-${index}`) % imageSet.length;

  for (let offset = 0; offset < imageSet.length; offset += 1) {
    const candidate = imageSet[(startIndex + offset) % imageSet.length];
    if (!usedImageUrls.has(candidate)) return candidate;
  }

  return pickAlternativeImage(type, currentImageUrl, activity, index);
};

export const resolveActivityImage = (activity: ActivityImageInput): ResolvedActivityImage => {
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

export const avoidConsecutiveActivityImages = <T extends ActivityImageInput>(activities: T[]): T[] => {
  let previousImageUrl = '';
  const usedImageUrls = new Set<string>();

  return activities.map((activity, index) => {
    const resolvedActivity = withResolvedActivityImage(activity);
    const imageUrl = resolvedActivity.imageUrl ?? '';
    const imageType = isActivityImageType(resolvedActivity.imageType)
      ? resolvedActivity.imageType
      : 'default-travel';
    const nonRepeatedImageUrl = imageUrl === previousImageUrl
      ? pickAlternativeImage(imageType, imageUrl, resolvedActivity, index)
      : imageUrl;
    const nextImageUrl = pickUnusedAlternativeImage(
      imageType,
      nonRepeatedImageUrl,
      resolvedActivity,
      index,
      usedImageUrls,
    );

    previousImageUrl = nextImageUrl;
    usedImageUrls.add(nextImageUrl);

    if (nextImageUrl === imageUrl) return resolvedActivity;

    return {
      ...resolvedActivity,
      imageUrl: nextImageUrl,
      imageReason: `${resolvedActivity.imageReason ?? '활동 이미지'} · 홈 이미지 중복 회피`,
    };
  });
};

export const logActivityImageMappings = (label: string, activities: ActivityImageInput[]) => {
  void label;
  void activities;
};
