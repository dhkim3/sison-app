export interface ActivitySaveRecord {
  id?: string;
  imageUrl: string;
  title: string;
  location: string;
  recruitmentStartDate?: string;
  recruitmentEndDate?: string;
  date?: string;
  time: string;
  status?: 'recruiting' | 'completed' | string;
  isRecruiting: boolean;
  distance?: string;
  description: string;
  materials: string;
  capacity: string;
  currentParticipants: string;
  recommendation: string;
  duration?: string;
  difficulty?: string;
  indoorOutdoor?: string;
  category?: string;
  volunteerPeriod?: string;
  recruitmentPeriod?: string;
  volunteerTime?: string;
  volunteerField?: string;
  volunteerTarget?: string;
  volunteerType?: string;
  recruitingOrganization?: string;
  registrationOrganization?: string;
  volunteerPlace?: string;
  latitude?: number;
  longitude?: number;
  applyUrl?: string;
  sourceUrl?: string;
  progrmRegistNo?: string;
}

export type ActivitySaveLookup = Pick<ActivitySaveRecord, 'title'> & {
  id?: string;
  date?: string;
  location?: string;
  time?: string;
};

export const getActivitySaveKey = (activity: ActivitySaveLookup) => {
  if (activity.id) return activity.id;

  return activity.title.trim().toLowerCase();
};

export const initialSavedActivities: ActivitySaveRecord[] = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    title: '광안리 해변 환경정화',
    location: '부산 수영구',
    recruitmentStartDate: '2026.07.10',
    recruitmentEndDate: '2026.07.18',
    date: '2026.07.20',
    time: '09:00 - 11:00',
    status: 'recruiting',
    isRecruiting: true,
    distance: '도보 10분',
    description: '광안리 바다를 가까이 느끼며 가볍게 참여할 수 있는 활동이에요. 아침 산책을 겸한 해변 정화 활동으로, 광안리 백사장과 주변 산책로를 따라 걸으며 환경 보호에 참여할 수 있습니다.',
    materials: '장갑, 집게 제공',
    capacity: '20명',
    currentParticipants: '15명',
    volunteerTarget: '성인 여행객',
    recommendation: '여행 일정 안에서 가볍게 참여하기 좋아요.',
    duration: '2시간',
    difficulty: '쉬움',
    indoorOutdoor: '실외',
    category: '환경정화',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1775116259654-404b3376c02e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    title: '수영 공원 산책로 정비',
    location: '부산 수영구',
    recruitmentStartDate: '2026.07.12',
    recruitmentEndDate: '2026.07.20',
    date: '2026.07.22',
    time: '14:00 - 16:00',
    status: 'recruiting',
    isRecruiting: true,
    distance: '차량 15분',
    description: '공원 산책로를 따라 걸으며 간단한 정비 활동을 합니다. 벤치 청소, 꽃길 관리 등 가벼운 활동으로 구성되어 있습니다.',
    materials: '편한 복장',
    capacity: '15명',
    currentParticipants: '8명',
    volunteerTarget: '성인 공원 이용객',
    recommendation: '오후 시간을 활용해 여유롭게 참여할 수 있어요.',
    duration: '2시간',
    difficulty: '쉬움',
    indoorOutdoor: '실외',
    category: '산책형 활동',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1610093674388-cee0337f2684?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    title: '해운대 바다 지키기',
    location: '부산 해운대구',
    recruitmentStartDate: '2026.06.01',
    recruitmentEndDate: '2026.06.12',
    date: '2026.06.15',
    time: '10:00 - 12:00',
    status: 'completed',
    isRecruiting: false,
    distance: '도보 25분',
    description: '해운대 백사장과 주변 지역의 환경 정화 활동입니다. 바다를 배경으로 뜻깊은 시간을 보낼 수 있습니다.',
    materials: '장갑, 집게 제공',
    capacity: '30명',
    currentParticipants: '22명',
    volunteerTarget: '성인 여행객',
    recommendation: '인기 관광지에서 진행되는 활동이라 여행 코스에 자연스럽게 포함할 수 있어요.',
    duration: '2시간',
    difficulty: '쉬움',
    indoorOutdoor: '실외',
    category: '환경정화',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    title: '안목해변 아침 플로깅',
    location: '강원 강릉시 안목해변',
    recruitmentStartDate: '2026.05.22',
    recruitmentEndDate: '2026.05.28',
    date: '2026.05.30',
    time: '08:00 - 10:00',
    status: 'completed',
    isRecruiting: false,
    distance: '도보 8분',
    description: '안목해변과 커피거리 주변을 천천히 걸으며 작은 쓰레기를 줍는 아침 플로깅입니다.',
    materials: '생분해 봉투, 집게 제공',
    capacity: '18명',
    currentParticipants: '18명',
    volunteerTarget: '성인 여행객',
    recommendation: '커피거리 산책 전 조용히 참여하기 좋은 활동이에요.',
    duration: '2시간',
    difficulty: '쉬움',
    indoorOutdoor: '실외',
    category: '환경정화',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    title: '비자림 숲길 표지 정리',
    location: '제주 제주시 구좌읍 비자림',
    recruitmentStartDate: '2026.06.02',
    recruitmentEndDate: '2026.06.08',
    date: '2026.06.11',
    time: '09:30 - 12:00',
    status: 'completed',
    isRecruiting: false,
    distance: '차량 35분',
    description: '비자림 산책로의 낙엽과 작은 가지를 정리하고 안내 표지를 닦는 활동입니다.',
    materials: '장갑, 편한 신발',
    capacity: '12명',
    currentParticipants: '12명',
    volunteerTarget: '성인 숲길 이용객',
    recommendation: '숲을 천천히 걷는 여행자에게 잘 맞아요.',
    duration: '2시간 30분',
    difficulty: '보통',
    indoorOutdoor: '실외',
    category: '산책형 활동',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    title: '전주 한옥마을 골목 행사 도우미',
    location: '전북 전주시 완산구 한옥마을',
    recruitmentStartDate: '2026.07.05',
    recruitmentEndDate: '2026.07.12',
    date: '2026.07.14',
    time: '10:00 - 13:00',
    status: 'recruiting',
    isRecruiting: true,
    distance: '도보 6분',
    description: '한옥마을 골목 장터에서 방문객 동선 안내와 체험 부스 정리를 돕습니다.',
    materials: '활동 명찰, 안내문 제공',
    capacity: '14명',
    currentParticipants: '7명',
    volunteerTarget: '성인 행사 방문객',
    recommendation: '전주 골목 여행과 자연스럽게 이어지는 일정이에요.',
    duration: '3시간',
    difficulty: '쉬움',
    indoorOutdoor: '실외',
    category: '지역 행사',
  },
];
