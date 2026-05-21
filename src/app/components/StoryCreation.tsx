import { useState } from 'react';
import { Plus } from 'lucide-react';
import { BottomTabBar } from './BottomTabBar';
import { RegionMapView } from './story/RegionMapView';
import { MyActivitiesView } from './story/MyActivitiesView';
import { StoryUploadView } from './story/StoryUploadView';
import { CardCreationView } from './story/CardCreationView';

interface StoryCreationProps {
  onNavigate: (screen: string) => void;
}

type StoryView = 'map' | 'my-activities' | 'upload' | 'card';

export function StoryCreation({ onNavigate }: StoryCreationProps) {
  const [currentView, setCurrentView] = useState<StoryView>('map');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [storyText, setStoryText] = useState('');

  // Mock user's applied activities
  const myActivities = [
    {
      id: 1,
      title: '광안리 해변 환경정화',
      location: '부산 수영구 광안리해수욕장',
      region: '부산',
      recruitmentStartDate: '2026.07.10',
      recruitmentEndDate: '2026.07.18',
      date: '2026.07.20',
      time: '09:00 - 11:00',
      status: '참여 완료',
      participants: '15명',
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
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
      imageUrl: 'https://images.unsplash.com/photo-1612977512598-3b8d6a498bbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
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
      imageUrl: 'https://images.unsplash.com/photo-1775116259654-404b3376c02e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    },
    {
      id: 4,
      title: '강릉 안목해변 플로깅',
      location: '강원 강릉시 안목해변',
      region: '강원',
      recruitmentStartDate: '2026.07.28',
      recruitmentEndDate: '2026.08.03',
      date: '2026.08.05',
      time: '08:00 - 10:00',
      status: '참여 예정',
      participants: '12명',
      imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    },
  ];

  const handleCreateStory = () => {
    setCurrentView('my-activities');
  };

  const handleSelectActivity = (activity: any) => {
    setSelectedActivity(activity);
    setCurrentView('upload');
    setUploadedPhotos([]);
    setStoryText('');
  };

  const handleBackToMap = () => {
    setCurrentView('map');
    setSelectedRegion(null);
    setSelectedActivity(null);
    setUploadedPhotos([]);
    setStoryText('');
  };

  const handleBackToActivities = () => {
    setCurrentView('my-activities');
    setSelectedActivity(null);
    setUploadedPhotos([]);
    setStoryText('');
  };

  const handleGoToCardCreation = () => {
    setCurrentView('card');
  };

  const handleSaveStory = () => {
    alert('스토리가 저장되었습니다');
    handleBackToMap();
  };

  const handleSaveCard = () => {
    alert('카드가 저장되었습니다');
    handleBackToMap();
  };

  return (
    <>
      {currentView === 'map' && (
        <RegionMapView
          onNavigate={onNavigate}
          onCreateStory={handleCreateStory}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
        />
      )}

      {currentView === 'my-activities' && (
        <MyActivitiesView
          activities={myActivities}
          onBack={handleBackToMap}
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
          onPhotosChange={setUploadedPhotos}
          storyText={storyText}
          onTextChange={setStoryText}
          onNavigate={onNavigate}
        />
      )}

      {currentView === 'card' && selectedActivity && uploadedPhotos.length > 0 && (
        <CardCreationView
          activity={selectedActivity}
          photo={uploadedPhotos[0]}
          onBack={() => setCurrentView('upload')}
          onSave={handleSaveCard}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}
