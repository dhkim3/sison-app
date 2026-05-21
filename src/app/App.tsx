import { useState } from 'react';
import { Home } from './components/Home';
import { SearchTab } from './components/SearchTab';
import { AIRecommendation } from './components/AIRecommendation';
import { StoryCreation } from './components/StoryCreation';
import { SavedArchive } from './components/SavedArchive';
import { ProfileScreen } from './components/ProfileScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'search' | 'ai-recommendation' | 'story' | 'saved' | 'profile'>('home');

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as any);
  };

  return (
    <div className="screen-transition">
      {currentScreen === 'home' && <Home onNavigate={handleNavigate} />}
      {currentScreen === 'search' && <SearchTab onNavigate={handleNavigate} />}
      {currentScreen === 'ai-recommendation' && <AIRecommendation onNavigate={handleNavigate} />}
      {currentScreen === 'story' && <StoryCreation onNavigate={handleNavigate} />}
      {currentScreen === 'saved' && <SavedArchive onNavigate={handleNavigate} />}
      {currentScreen === 'profile' && <ProfileScreen onNavigate={handleNavigate} />}
    </div>
  );
}
