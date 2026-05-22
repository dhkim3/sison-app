export interface ActivitySaveRecord {
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
}

export const getActivitySaveKey = (activity: Pick<ActivitySaveRecord, 'title'> & { date?: string }) =>
  `${activity.title}::${activity.date || ''}`;

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
    recommendation: '인기 관광지에서 진행되는 활동이라 여행 코스에 자연스럽게 포함할 수 있어요.',
    duration: '2시간',
    difficulty: '쉬움',
    indoorOutdoor: '실외',
    category: '환경정화',
  },
];
