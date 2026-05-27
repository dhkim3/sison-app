import { useEffect, useState } from 'react';
import { Bell, Bookmark, Calendar, Clock, Leaf, MapPin } from 'lucide-react';
import { formatActivityDate, getRecruitmentDeadlineLabel } from '../activityFormatters';
import { EnhancedSearchCard } from './EnhancedSearchCard';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { PeopleCountModal } from './PeopleCountModal';
import { CompactActivityCard } from './CompactActivityCard';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import { NotificationSheet } from './NotificationSheet';
import { HomeAIRecommendationFlow } from './HomeAIRecommendationFlow';
import type { ActivitySaveLookup, ActivitySaveRecord } from '../activitySaveState';
import type { SearchState } from '../searchState';

interface HomeProps {
  onNavigate: (screen: string, options?: { activity?: ActivitySaveRecord; returnScreen?: 'home' | 'search' | 'saved' }) => void;
  onSearchSubmit: (values: Omit<SearchState, 'hasSearched'>) => void;
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
}

const heroImages = [
  {
    src: '/home-hero-1.png',
    alt: '봄날 강변 산책길을 따라 여행하는 사람들',
  },
  {
    src: '/home-hero-2.png',
    alt: '바닷가에서 함께 해변을 정리하는 사람들',
  },
  {
    src: '/home-hero-3.png',
    alt: '숲길을 걸으며 자연을 정리하는 사람들',
  },
];

interface HiddenPlaceActivityCardProps {
  activity: ActivitySaveRecord;
  isSaved: boolean;
  onBookmarkClick: () => void;
  onClick: () => void;
}

function HiddenPlaceActivityCard({
  activity,
  isSaved,
  onBookmarkClick,
  onClick,
}: HiddenPlaceActivityCardProps) {
  const dateTime = [formatActivityDate(activity.date), activity.time].filter(Boolean).join(' · ');
  const recruitmentMetadata = getRecruitmentDeadlineLabel(activity.recruitmentEndDate);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className="group relative h-[144px] w-full cursor-pointer overflow-hidden rounded-[1.75rem] bg-[#f2f0ea] shadow-[0_8px_24px_rgba(40,45,42,0.08)] transition-all active:scale-[0.985]"
    >
      <img
        src={activity.imageUrl}
        alt={activity.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,25,23,0.72)_0%,rgba(21,25,23,0.46)_44%,rgba(21,25,23,0.10)_78%,rgba(21,25,23,0.04)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,22,20,0.16)_0%,rgba(18,22,20,0.02)_42%,rgba(18,22,20,0.20)_100%)]" />

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBookmarkClick();
        }}
        aria-label={isSaved ? '저장 취소' : '활동 저장'}
        className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-[#5a5a5a] shadow-[0_6px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all hover:bg-white active:scale-95"
      >
        <Bookmark
          className={`h-4 w-4 ${isSaved ? 'fill-[#a8d5ba] text-[#7fb894]' : 'text-[#5a5a5a]'}`}
          strokeWidth={2}
        />
      </button>

      <div className="absolute inset-y-0 left-0 flex w-[78%] flex-col justify-center px-4 py-4 text-white">
        <h4 className="max-w-[230px] text-[18px] font-semibold leading-snug text-white drop-shadow-sm">
          {activity.title}
        </h4>
        <div className="mt-2 space-y-1.5">
          {dateTime && (
            <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] leading-none text-white/84">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-white/74" strokeWidth={2} />
              <span className="line-clamp-1">{dateTime}</span>
            </div>
          )}
          {activity.location && (
            <div className="flex items-center gap-1.5 text-[11.5px] leading-none text-white/82">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-white/72" strokeWidth={2} />
              <span className="line-clamp-1">{activity.location}</span>
            </div>
          )}
          {recruitmentMetadata && (
            <span className="inline-flex w-fit rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-medium leading-none text-white/86 backdrop-blur-sm">
              {recruitmentMetadata}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface RecentTimelineActivityCardProps {
  activity: ActivitySaveRecord;
  isSaved: boolean;
  index: number;
  isLast: boolean;
  onBookmarkClick: () => void;
  onClick: () => void;
}

function RecentTimelineActivityCard({
  activity,
  isSaved,
  index,
  isLast,
  onBookmarkClick,
  onClick,
}: RecentTimelineActivityCardProps) {
  const registeredLabels = ['방금 등록', '2시간 전 등록', '5시간 전 등록'];
  const dotColors = ['bg-[#6fa985]', 'bg-[#5f9fc9]', 'bg-[#8270bd]'];
  const registeredTextColors = ['text-[#6fa985]', 'text-[#5f9fc9]', 'text-[#8270bd]'];
  const registeredLabel = registeredLabels[index] || '오늘 등록';
  const registeredTextColor = registeredTextColors[index % registeredTextColors.length];
  const dateTime = [formatActivityDate(activity.date), activity.time].filter(Boolean).join(' · ');
  const recruitmentMetadata = getRecruitmentDeadlineLabel(activity.recruitmentEndDate);

  return (
    <div className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center pt-2">
        <span className={`relative z-10 h-2.5 w-2.5 rounded-full ${dotColors[index % dotColors.length]} shadow-[0_0_0_4px_rgba(255,255,255,0.92)]`} />
        {!isLast && <span className="absolute top-5 bottom-[-18px] w-px bg-[#e4e1da]" />}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
        className="w-full cursor-pointer rounded-2xl border border-black/[0.04] bg-white px-4 py-3 shadow-[0_2px_12px_rgba(39,45,40,0.035)] transition-all active:scale-[0.985]"
      >
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className={`text-[12px] font-medium leading-none ${registeredTextColor}`}>
            {registeredLabel}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onBookmarkClick();
            }}
            aria-label={isSaved ? '저장 취소' : '활동 저장'}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#5a5a5a] transition-colors hover:bg-[#f8f8f5] active:scale-95"
          >
            <Bookmark
              className={`h-4 w-4 ${isSaved ? 'fill-[#a8d5ba] text-[#7fb894]' : 'text-[#5a5a5a]'}`}
              strokeWidth={2}
            />
          </button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_82px] gap-3">
          <div className="min-w-0">
            <h4 className="line-clamp-2 text-[16px] font-semibold leading-snug text-[#2a2a2a]">
              {activity.title}
            </h4>

            <div className="mt-3 space-y-1.5">
              {dateTime && (
                <div className="flex items-center gap-2 text-[12.5px] leading-none text-[#5a5a5a]">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-[#a8d5ba]" strokeWidth={2} />
                  <span className="line-clamp-1">{dateTime}</span>
                </div>
              )}
              {activity.location && (
                <div className="flex items-center gap-2 text-[12.5px] leading-none text-[#666]">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#c9897e]" strokeWidth={2} />
                  <span className="line-clamp-1">{activity.location}</span>
                </div>
              )}
              {recruitmentMetadata && (
                <div className="flex items-center gap-2 text-[12px] leading-none text-[#8f8f8f]">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[#b8b2aa]" strokeWidth={1.8} />
                  <span>{recruitmentMetadata}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-[82px] overflow-hidden rounded-xl bg-[#f3f0ea]">
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Home({ onNavigate, onSearchSubmit, isActivitySaved, onToggleSavedActivity }: HomeProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [peopleCount, setPeopleCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPeopleCountOpen, setIsPeopleCountOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAIRecommendationFlowOpen, setIsAIRecommendationFlowOpen] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    heroImages.forEach((image) => {
      const preloadImage = new Image();
      preloadImage.src = image.src;
    });
  }, []);

  useEffect(() => {
    const heroTimer = window.setInterval(() => {
      setActiveHeroIndex((currentIndex) => (currentIndex + 1) % heroImages.length);
    }, 7000);

    return () => window.clearInterval(heroTimer);
  }, []);

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    return `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
  };

  const formatDateRangeFull = () => {
    if (!startDate || !endDate) return '';
    return `2026.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')} - 2026.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')}`;
  };

  const handleSearch = () => {
    onSearchSubmit({
      destination: destination.trim(),
      startDate,
      endDate,
      dateRangeLabel: formatDateRangeFull(),
      peopleCount: 0,
    });
  };

  const handleDateConfirm = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handlePeopleConfirm = (count: number) => {
    setPeopleCount(count);
  };

  const lightweightActivities = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '광안리 해변 환경정화',
      location: '부산 수영구 광안리해수욕장',
      recruitmentStartDate: '2026.06.01',
      recruitmentEndDate: '2026.06.08',
      date: '2026.06.10',
      time: '09:00 - 11:00',
      distance: '도보 10분',
      isRecruiting: true,
      description: '광안리 바다를 가까이 느끼며 가볍게 참여할 수 있는 활동이에요. 아침 산책을 겸한 해변 정화 활동으로, 광안리 백사장과 주변 산책로를 따라 걸으며 환경 보호에 참여할 수 있습니다.',
      materials: '장갑, 집게 제공',
      capacity: '20명',
      currentParticipants: '15명',
      recommendation: '여행 일정 안에서 가볍게 참여하기 좋아요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1775116259654-404b3376c02e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '수영 공원 산책로 정비',
      location: '부산 수영구 수영 근린공원',
      recruitmentStartDate: '2026.06.03',
      recruitmentEndDate: '2026.06.10',
      date: '2026.06.12',
      time: '14:00 - 16:00',
      distance: '차량 15분',
      isRecruiting: true,
      description: '공원 산책로를 따라 걸으며 간단한 정비 활동을 합니다. 벤치 청소, 꽃길 관리 등 가벼운 활동으로 구성되어 있습니다.',
      materials: '편한 복장',
      capacity: '15명',
      currentParticipants: '8명',
      recommendation: '오후 시간을 활용해 여유롭게 참여할 수 있어요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '안목해변 아침 플로깅',
      location: '강원 강릉시 안목해변',
      recruitmentStartDate: '2026.06.05',
      recruitmentEndDate: '2026.06.12',
      date: '2026.06.14',
      time: '08:00 - 10:00',
      distance: '도보 8분',
      isRecruiting: true,
      description: '안목해변과 커피거리 주변을 천천히 걸으며 작은 쓰레기를 줍는 아침 활동입니다. 여행의 시작을 조용히 정리하는 기분이 남아요.',
      materials: '생분해 봉투, 집게 제공',
      capacity: '18명',
      currentParticipants: '9명',
      recommendation: '짧은 일정에도 부담 없이 넣기 좋아요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '비자림 숲길 표지 정리',
      location: '제주 제주시 구좌읍 비자림',
      recruitmentStartDate: '2026.06.08',
      recruitmentEndDate: '2026.06.16',
      date: '2026.06.18',
      time: '09:30 - 12:00',
      distance: '차량 35분',
      isRecruiting: true,
      description: '비자림 산책로의 낙엽과 작은 가지를 정리하고 안내 표지를 닦는 활동입니다. 숲의 고요함을 오래 바라보는 일정이에요.',
      materials: '장갑, 편한 신발',
      capacity: '12명',
      currentParticipants: '6명',
      recommendation: '숲을 천천히 걷는 여행자에게 잘 맞아요.',
      duration: '2시간 30분',
      difficulty: '보통',
      indoorOutdoor: '실외',
    },
  ];

  const recentActivities = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '통영 강구안 골목 안내',
      location: '경남 통영시 강구안',
      recruitmentStartDate: '2026.06.18',
      recruitmentEndDate: '2026.06.24',
      date: '2026.06.27',
      time: '10:00 - 13:00',
      distance: '도보 7분',
      isRecruiting: true,
      description: '항구 주변 골목을 찾는 여행자에게 길을 안내하고 작은 행사 동선을 돕는 활동입니다.',
      materials: '안내 리플릿 제공',
      capacity: '12명',
      currentParticipants: '5명',
      recommendation: '통영 산책 일정과 자연스럽게 이어가기 좋아요.',
      duration: '3시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '여수 돌산 해안 쓰담 걷기',
      location: '전남 여수시 돌산읍',
      recruitmentStartDate: '2026.07.01',
      recruitmentEndDate: '2026.07.07',
      date: '2026.07.09',
      time: '16:00 - 18:00',
      distance: '차량 20분',
      isRecruiting: true,
      description: '돌산 해안 산책길을 따라 걸으며 해변과 방파제 주변을 정리합니다.',
      materials: '장갑, 집게, 물 제공',
      capacity: '16명',
      currentParticipants: '11명',
      recommendation: '활동 후 해질녘 전망대 코스로 이어가기 좋습니다.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '애월 마을 플리마켓 정리',
      location: '제주 제주시 애월읍',
      recruitmentStartDate: '2026.07.03',
      recruitmentEndDate: '2026.07.10',
      date: '2026.07.12',
      time: '13:00 - 16:00',
      distance: '도보 12분',
      isRecruiting: true,
      description: '작은 마을 플리마켓에서 부스 정리와 방문객 안내를 돕는 활동입니다.',
      materials: '활동 명찰 제공',
      capacity: '10명',
      currentParticipants: '4명',
      recommendation: '애월 카페 거리와 함께 둘러보기 좋은 일정이에요.',
      duration: '3시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
  ];

  const hiddenPlaceActivities = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '성산 작은 숲길 표지 닦기',
      location: '제주 서귀포시 성산읍',
      recruitmentStartDate: '2026.06.20',
      recruitmentEndDate: '2026.06.26',
      date: '2026.06.29',
      time: '09:30 - 11:30',
      distance: '차량 18분',
      isRecruiting: true,
      description: '조용한 숲길 입구의 안내 표지를 닦고 산책로 주변을 정리합니다.',
      materials: '장갑, 손수건',
      capacity: '8명',
      currentParticipants: '3명',
      recommendation: '사람이 많지 않은 길을 천천히 걷는 여행자에게 잘 맞아요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1468581264429-2548ef9eb732?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '해운대 뒷골목 화분 돌보기',
      location: '부산 해운대구 우동',
      recruitmentStartDate: '2026.06.22',
      recruitmentEndDate: '2026.06.28',
      date: '2026.06.30',
      time: '15:00 - 17:00',
      distance: '도보 15분',
      isRecruiting: true,
      description: '바닷가에서 조금 떨어진 골목의 작은 화분과 벤치 주변을 정리합니다.',
      materials: '장갑, 물조리개 제공',
      capacity: '9명',
      currentParticipants: '2명',
      recommendation: '붐비는 해변 너머의 동네 분위기를 발견하기 좋아요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '안목 작은 방파제 정리',
      location: '강원 강릉시 견소동',
      recruitmentStartDate: '2026.06.25',
      recruitmentEndDate: '2026.07.01',
      date: '2026.07.03',
      time: '08:30 - 10:30',
      distance: '도보 9분',
      isRecruiting: true,
      description: '커피거리 끝자락의 작은 방파제 주변을 천천히 걸으며 정리합니다.',
      materials: '집게, 생분해 봉투 제공',
      capacity: '7명',
      currentParticipants: '2명',
      recommendation: '아침 바다를 조용히 바라보는 일정과 잘 어울려요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
  ];

  const activitySections = [
    {
      title: '가벼운 활동',
      description: '여행 중 산책하듯 참여하기 좋아요',
      activities: lightweightActivities.slice(0, 3),
    },
    {
      title: '최근 올라온 활동',
      description: '새롭게 열린 일정을 모았어요',
      activities: recentActivities.slice(0, 3),
    },
    {
      title: '숨겨진 장소 발견',
      description: '조금 덜 알려진 길에서 만나는 활동',
      activities: hiddenPlaceActivities.slice(0, 3),
    },
  ];
  const allHomeActivities = [
    ...lightweightActivities,
    ...recentActivities,
    ...hiddenPlaceActivities,
  ];

  return (
    <>
      <PageShell>
        {/* Top Navigation */}
        <header className="sticky top-0 z-10 bg-[#fdfcfa]/95 backdrop-blur-sm">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#2a2a2a] leading-tight">시선</h1>
              <p className="text-[12px] text-[#aaa] mt-0.5">새로운 시선을 만나는 여행</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNotificationOpen(true)}
              aria-label="알림 열기"
              className="relative w-10 h-10 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center"
            >
              <Bell className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
              <span className="absolute right-[9px] top-[8px] h-[5px] w-[5px] rounded-full bg-[#a8d5ba]" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative h-[33vh] overflow-hidden">
          {heroImages.map((image, index) => (
            <img
              key={image.src}
              src={image.src}
              alt={image.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out ${
                index === activeHeroIndex ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={index !== activeHeroIndex}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
            <h2 className="text-white mb-2 leading-snug drop-shadow-sm">
              여행의 작은 틈에서,<br />새로운 시선을 만나보세요.
            </h2>
            <p className="text-white/90 text-sm drop-shadow-sm">
              여행지 가까이의 작은 활동을 찾아보세요.
            </p>
          </div>
        </section>

        {/* Enhanced Search Card */}
        <section className="px-5 -mt-4 relative z-10">
          <EnhancedSearchCard
            destination={destination}
            dateRange={formatDateRange()}
            peopleCount={peopleCount}
            onDateClick={() => setIsCalendarOpen(true)}
            onPeopleClick={() => setIsPeopleCountOpen(true)}
            onSearch={handleSearch}
            onDestinationChange={setDestination}
          />
        </section>

        {/* AI Recommendation Entry */}
        <section className="px-5 mt-4">
          <button
            type="button"
            onClick={() => setIsAIRecommendationFlowOpen(true)}
            className="relative block w-full overflow-hidden rounded-3xl border border-[#2e4260] bg-[#090f24] px-3.5 py-4 text-left shadow-[0_10px_24px_rgba(22,42,78,0.18)] transition-transform active:scale-[0.985]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_38%,rgba(74,114,255,0.16),transparent_28%),radial-gradient(circle_at_70%_70%,rgba(135,78,238,0.15),transparent_30%),linear-gradient(135deg,rgba(18,31,66,0.86),rgba(8,12,31,0.97))]" aria-hidden="true" />
            <div className="absolute right-0 top-0 h-full w-[122px] overflow-hidden" aria-hidden="true">
              <div className="absolute right-[9px] top-[12px] h-[86px] w-[86px] rounded-full bg-[radial-gradient(circle_at_42%_32%,rgba(92,173,255,0.32)_0%,rgba(75,67,201,0.20)_34%,rgba(21,18,63,0.05)_63%,transparent_74%)] blur-[3px]" />
              <div className="absolute right-[25px] top-[22px] h-[62px] w-[62px] rounded-full border border-[#9165ff]/70 bg-[radial-gradient(circle_at_36%_30%,rgba(79,159,255,0.72)_0%,rgba(57,76,191,0.44)_30%,rgba(74,35,137,0.58)_62%,rgba(15,12,44,0.96)_100%)] shadow-[inset_9px_-11px_22px_rgba(7,9,34,0.58),inset_-12px_10px_20px_rgba(95,172,255,0.24),0_0_18px_rgba(71,148,255,0.34),0_0_28px_rgba(137,72,255,0.24)]" />
              <div className="absolute right-[4px] top-[31px] h-[42px] w-[106px] rotate-[-22deg] rounded-full border border-[#8a5cff]/36 border-l-[#5ad4ff]/28 border-b-transparent border-r-[#7a5fff]/45" />
              <div className="absolute right-[48px] top-[46px] h-[17px] w-[17px] rotate-45 rounded-[5px] bg-[linear-gradient(135deg,#f9ffff_5%,#9ffff3_42%,#ffb4fd_58%,#7b62ff_100%)] shadow-[0_0_14px_rgba(165,255,247,0.82),0_0_24px_rgba(149,91,255,0.46)]" />
              <div className="absolute right-[2px] top-[34px] h-[5px] w-[5px] rounded-full bg-[#6c92ff] shadow-[0_0_10px_rgba(108,146,255,0.85)]" />
              <div className="absolute right-[101px] top-[76px] h-[5px] w-[5px] rounded-full bg-[#8d66ff] shadow-[0_0_9px_rgba(141,102,255,0.78)]" />
              <div className="absolute right-[86px] top-[47px] h-[3px] w-[3px] rounded-full bg-[#45c8ff] shadow-[0_0_7px_rgba(69,200,255,0.72)]" />
              <div className="absolute right-[60px] top-[88px] h-[2px] w-[2px] rounded-full bg-[#6aa4ff]/70" />
              <div className="absolute right-[34px] top-[73px] h-[2px] w-[2px] rounded-full bg-[#7e6cff]/60" />
            </div>

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 pr-16">
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#5ee7dc]/30 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-[#c8fff8]">
                  <Leaf className="h-3 w-3 text-[#78f2e8]" strokeWidth={2} />
                  AI 추천
                </div>
                <h3 className="text-[15px] font-semibold leading-snug text-white">
                  내 여행에 맞는<br />활동을 찾아볼까요?
                </h3>
              </div>
            </div>
          </button>
        </section>

        {/* Calendar Bottom Sheet */}
        <CalendarBottomSheet
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          onConfirm={handleDateConfirm}
          initialStartDate={startDate || undefined}
          initialEndDate={endDate || undefined}
        />

        {/* People Count Modal */}
        <PeopleCountModal
          isOpen={isPeopleCountOpen}
          onClose={() => setIsPeopleCountOpen(false)}
          onConfirm={handlePeopleConfirm}
          initialCount={peopleCount || 1}
        />

        {/* Home Activity Sections */}
        <div className="px-5 mt-5 mb-8 space-y-8">
          {activitySections.map((section) => (
            <section key={section.title}>
              <div className="mb-3.5">
                <h3 className="text-[15px] font-semibold text-[#2a2a2a] mb-1">{section.title}</h3>
                <p className="text-[12px] text-[#aaa]">{section.description}</p>
              </div>
              <div className="space-y-2.5">
                {section.activities.map((activity, activityIndex) => (
                  section.title === '최근 올라온 활동' ? (
                    <RecentTimelineActivityCard
                      key={`${section.title}-${activity.title}`}
                      activity={activity}
                      index={activityIndex}
                      isLast={activityIndex === section.activities.length - 1}
                      isSaved={isActivitySaved(activity)}
                      onBookmarkClick={() => onToggleSavedActivity(activity)}
                      onClick={() => { setSelectedActivity(activity); setIsDetailOpen(true); }}
                    />
                  ) : section.title === '숨겨진 장소 발견' ? (
                    <HiddenPlaceActivityCard
                      key={`${section.title}-${activity.title}`}
                      activity={activity}
                      isSaved={isActivitySaved(activity)}
                      onBookmarkClick={() => onToggleSavedActivity(activity)}
                      onClick={() => { setSelectedActivity(activity); setIsDetailOpen(true); }}
                    />
                  ) : (
                    <CompactActivityCard
                      key={`${section.title}-${activity.title}`}
                      imageUrl={activity.imageUrl}
                      title={activity.title}
                      location={activity.location}
                      recruitmentStartDate={activity.recruitmentStartDate}
                      recruitmentEndDate={activity.recruitmentEndDate}
                      date={activity.date}
                      time={activity.time}
                      showBookmark
                      isSaved={isActivitySaved(activity)}
                      onBookmarkClick={() => onToggleSavedActivity(activity)}
                      onClick={() => { setSelectedActivity(activity); setIsDetailOpen(true); }}
                    />
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="home" onNavigate={onNavigate} />

      {/* Notifications */}
      <NotificationSheet
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <HomeAIRecommendationFlow
        isOpen={isAIRecommendationFlowOpen}
        activities={allHomeActivities}
        isActivitySaved={isActivitySaved}
        onClose={() => setIsAIRecommendationFlowOpen(false)}
        onToggleSavedActivity={onToggleSavedActivity}
        onOpenActivity={(activity) => {
          setIsAIRecommendationFlowOpen(false);
          setSelectedActivity(activity);
          setIsDetailOpen(true);
        }}
      />

      {/* Activity Detail Bottom Sheet */}
      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={(activity) => { setIsDetailOpen(false); onNavigate('ai-recommendation', { activity, returnScreen: 'home' }); }}
          isSaved={isActivitySaved(selectedActivity)}
          onToggleSaved={() => onToggleSavedActivity(selectedActivity)}
          activity={selectedActivity}
        />
      )}
    </>
  );
}
