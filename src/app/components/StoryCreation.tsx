import { useEffect, useLayoutEffect, useState } from 'react';
import { RegionMapView } from './story/RegionMapView';
import { MyActivitiesView } from './story/MyActivitiesView';
import { StoryUploadView } from './story/StoryUploadView';
import { CardCreationView } from './story/CardCreationView';
import { storyApi, type StoryCardItem, type StoryInteractionProps } from '../storyInteractionState';
import { getAIFrameJobById } from '../aiFrameJobState';
import type { StoryItem } from './story/storyTypes';
import { scrollToTop } from '../utils/scrollToTop';

type StoryView = 'map' | 'my-activities' | 'upload' | 'card';

interface StoryCreationProps {
  onNavigate: (screen: string, options?: { savedTab?: 0 | 1 | 2 }) => void;
  storyInteractions: StoryInteractionProps;
  userStories: StoryItem[];
  deletedStoryIds?: string[];
  profileNickname: string;
  onCreateStory: (story: StoryItem) => void | Promise<void>;
  onDeleteStory: (story: StoryItem) => void;
  pendingCardStory?: StoryItem | null;
  onPendingCardConsumed?: () => void;
  pendingAIFrameJobId?: string | null;
  onPendingAIFrameJobConsumed?: () => void;
  onStoryViewChange?: (view: StoryView | null) => void;
  onActiveAIFrameTargetChange?: (targetKey: string | null) => void;
  onSaveTravelCard?: (card: StoryCardItem) => void;
  onDismissAIFrameJob?: (jobId: string) => void;
}

export function StoryCreation({
  onNavigate,
  storyInteractions,
  userStories,
  deletedStoryIds,
  profileNickname,
  onCreateStory,
  onDeleteStory,
  pendingCardStory,
  onPendingCardConsumed,
  pendingAIFrameJobId,
  onPendingAIFrameJobConsumed,
  onStoryViewChange,
  onActiveAIFrameTargetChange,
  onSaveTravelCard,
  onDismissAIFrameJob,
}: StoryCreationProps) {
  const [currentView, setCurrentView] = useState<StoryView>('map');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyText, setStoryText] = useState('');
  const [didTrySubmitStory, setDidTrySubmitStory] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [cardStoryId, setCardStoryId] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    scrollToTop();
  }, [currentView]);

  useEffect(() => {
    onStoryViewChange?.(currentView);
    return () => onStoryViewChange?.(null);
  }, [currentView, onStoryViewChange]);

  useEffect(() => {
    return () => {
      uploadedPhotos.forEach((photo) => {
        if (photo.startsWith('blob:')) {
          URL.revokeObjectURL(photo);
        }
      });
    };
  }, [uploadedPhotos]);

  const handlePhotosChange = (nextPhotos: string[]) => {
    setUploadedPhotos((currentPhotos) => {
      currentPhotos.forEach((photo) => {
        if (photo.startsWith('blob:') && !nextPhotos.includes(photo)) {
          URL.revokeObjectURL(photo);
        }
      });

      return nextPhotos.slice(0, 1);
    });
  };

  // Mock user's applied activities
  const myActivities = [
    {
      id: 1,
      title: '광안리 해변 환경정화',
      location: '부산 수영구 광안리해수욕장',
      region: '부산',
      recruitmentStartDate: '2026.04.02',
      recruitmentEndDate: '2026.04.10',
      date: '2026.06.20',
      time: '09:00 - 11:00',
      status: '참여 완료',
      participants: '15명',
      imageUrl: '/activity-images/beach-cleanup-1.png',
    },
    {
      id: 2,
      title: '함덕해수욕장 해양 환경 정화 봉사',
      location: '제주 제주시',
      region: '제주',
      recruitmentStartDate: '2026.06.01',
      recruitmentEndDate: '2026.06.12',
      date: '2026.06.15',
      time: '10:00 - 12:00',
      status: '참여 완료',
      participants: '20명',
      imageUrl: '/activity-images/beach-cleanup-3.png',
    },
    {
      id: 3,
      title: '수영 공원 산책로 정비',
      location: '부산 수영구 수영 근린공원',
      region: '부산',
      recruitmentStartDate: '2026.05.20',
      recruitmentEndDate: '2026.05.26',
      date: '2026.05.28',
      time: '14:00 - 16:00',
      status: '종료됨',
      participants: '8명',
      imageUrl: '/activity-images/forest-trail-2.png',
    },
    {
      id: 4,
      title: '안목해변 플로깅',
      location: '강원 강릉시 안목해변',
      region: '강원',
      recruitmentStartDate: '2026.06.10',
      recruitmentEndDate: '2026.06.18',
      date: '2026.04.12',
      time: '08:00 - 10:00',
      status: '참여 예정',
      participants: '12명',
      imageUrl: '/activity-images/beach-cleanup-2.png',
    },
    {
      id: 5,
      title: '성산 해안 쓰담 걷기',
      location: '제주 서귀포시 성산읍',
      region: '제주',
      recruitmentStartDate: '2026.05.01',
      recruitmentEndDate: '2026.05.08',
      date: '2026.05.10',
      time: '16:00 - 18:00',
      status: '참여 완료',
      participants: '14명',
      imageUrl: '/activity-images/festival-event-1.png',
    },
    {
      id: 6,
      title: '통영 항구 마을 행사 도우미',
      location: '경남 통영시 강구안',
      region: '경남',
      recruitmentStartDate: '2026.04.18',
      recruitmentEndDate: '2026.04.24',
      date: '2026.04.26',
      time: '13:00 - 16:00',
      status: '참여 완료',
      participants: '9명',
      imageUrl: '/activity-images/festival-event-2.png',
    },
    {
      id: 7,
      title: '속초 영랑호 산책로 정비',
      location: '강원 속초시 영랑호',
      region: '강원',
      recruitmentStartDate: '2026.03.20',
      recruitmentEndDate: '2026.03.26',
      date: '2026.03.28',
      time: '09:30 - 11:30',
      status: '참여 완료',
      participants: '11명',
      imageUrl: '/activity-images/default-travel-2.png',
    },
  ];

  const isPastActivity = (activity: (typeof myActivities)[number]) => {
    const match = activity.date.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
    const activityDate = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activity.status === '참여 완료' || activity.status === '종료됨' || (activityDate !== null && activityDate < today);
  };

  const storySelectableActivities = myActivities
    .filter(isPastActivity)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleCreateStory = () => {
    setCurrentView('my-activities');
  };

  const handleSelectActivity = (activity: any) => {
    setSelectedActivity(activity);
    setCurrentView('upload');
    handlePhotosChange([]);
    setStoryTitle('');
    setStoryText('');
    setDidTrySubmitStory(false);
    setSaveMessage('');
  };

  const handleBackToMap = (preserveUploadedPhoto = false) => {
    setCurrentView('map');
    setSelectedRegion(null);
    setSelectedActivity(null);
    if (preserveUploadedPhoto) {
      setUploadedPhotos([]);
    } else {
      handlePhotosChange([]);
    }
    setStoryTitle('');
    setStoryText('');
    setDidTrySubmitStory(false);
    setSaveMessage('');
  };

  const handleBackToActivities = () => {
    setCurrentView('my-activities');
    setSelectedActivity(null);
    handlePhotosChange([]);
    setStoryTitle('');
    setStoryText('');
    setDidTrySubmitStory(false);
    setSaveMessage('');
  };

  const handleGoToCardCreation = () => {
    if (storyTitle.trim().length === 0) {
      setDidTrySubmitStory(true);
      return;
    }

    setCurrentView('card');
  };

  // C-2: 내가 올린 스토리에서 'AI 카드 제작'으로 진입
  const handleCreateCardFromStory = (story: StoryItem) => {
    setSelectedActivity({
      id: story.id,
      title: story.activityTitle ?? story.relatedActivity ?? story.title,
      region: story.region,
      location: story.location ?? story.region,
      date: story.activityDate ?? '',
      imageUrl: story.imageUrl,
    });
    setUploadedPhotos([story.imageUrl]);
    setStoryTitle(story.title);
    setCardStoryId(story.id);
    setCurrentView('card');
  };

  // 저장 탭 등 다른 화면에서 'AI 카드 제작'으로 진입한 경우 카드 생성 화면을 연다
  useEffect(() => {
    if (pendingCardStory) {
      handleCreateCardFromStory(pendingCardStory);
      onPendingCardConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCardStory]);

  useEffect(() => {
    if (!pendingAIFrameJobId) return;
    const job = getAIFrameJobById(pendingAIFrameJobId);
    if (job) {
      setSelectedActivity(job.activity);
      setUploadedPhotos([job.photo]);
      setStoryTitle(job.storyTitle);
      setCardStoryId(job.storyId);
      setCurrentView('card');
    }
    onPendingAIFrameJobConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAIFrameJobId]);

  const handleSaveStory = async () => {
    if (storyTitle.trim().length === 0) {
      setDidTrySubmitStory(true);
      return;
    }

    setSaveMessage('스토리를 저장하고 있어요…');

    let imageUrl = uploadedPhotos[0] ?? selectedActivity?.imageUrl ?? '';
    if (imageUrl.startsWith('data:')) {
      try {
        imageUrl = await storyApi.uploadPhoto(imageUrl);
      } catch (error) {
        console.error('photo upload failed', error);
        setSaveMessage('사진 저장에 실패했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
    }

    const nextStory: StoryItem = {
      id: Date.now(),
      title: storyTitle.trim(),
      region: selectedActivity?.region ?? '여행',
      city: selectedActivity?.location?.split(' ')[1] ?? selectedActivity?.region ?? '여행',
      location: selectedActivity?.location ?? selectedActivity?.region ?? '여행지',
      author: profileNickname,
      authorName: profileNickname,
      likes: 0,
      likeCount: 0,
      comments: 0,
      imageUrl,
      body: storyText.trim(),
      content: storyText.trim(),
      relatedActivity: selectedActivity?.title,
      activityTitle: selectedActivity?.title,
      activityDate: selectedActivity?.date,
      createdAt: '방금 전',
      tags: [],
    };

    try {
      await onCreateStory(nextStory);
      handleBackToMap(true);
    } catch (error) {
      console.error('story save failed', error);
      setSaveMessage('스토리를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <>
      {currentView === 'map' && (
        <RegionMapView
          onNavigate={onNavigate}
          onCreateStory={handleCreateStory}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
          storyInteractions={storyInteractions}
          userStories={userStories}
          deletedStoryIds={deletedStoryIds}
          onCreateCard={handleCreateCardFromStory}
          onDeleteStory={onDeleteStory}
        />
      )}

      {currentView === 'my-activities' && (
        <MyActivitiesView
          activities={storySelectableActivities}
          onBack={() => handleBackToMap()}
          onSelectActivity={handleSelectActivity}
          onNavigate={onNavigate}
        />
      )}

      {currentView === 'upload' && selectedActivity && (
        <StoryUploadView
          activity={selectedActivity}
          onBack={handleBackToActivities}
          onSave={handleSaveStory}
          onCreateCard={handleGoToCardCreation}
          photos={uploadedPhotos}
          onPhotosChange={handlePhotosChange}
          storyTitle={storyTitle}
          onTitleChange={(nextTitle) => {
            setStoryTitle(nextTitle);
            if (nextTitle.trim().length > 0) {
              setDidTrySubmitStory(false);
            }
          }}
          storyText={storyText}
          onTextChange={setStoryText}
          onNavigate={onNavigate}
          didTrySubmit={didTrySubmitStory}
          saveMessage={saveMessage}
        />
      )}

      {currentView === 'card' && selectedActivity && uploadedPhotos.length > 0 && (
        <CardCreationView
          activity={selectedActivity}
          photo={uploadedPhotos[0]}
          storyTitle={storyTitle}
          storyId={cardStoryId}
          onBack={() => handleBackToMap()}
          onSaved={() => handleBackToMap()}
          onNavigate={onNavigate}
          onActiveAIFrameTargetChange={onActiveAIFrameTargetChange}
          onSaveTravelCard={onSaveTravelCard}
          onDismissAIFrameJob={onDismissAIFrameJob}
        />
      )}
    </>
  );
}
