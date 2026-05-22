import { useState } from 'react';
import { Home } from './components/Home';
import { SearchTab } from './components/SearchTab';
import { AIRecommendation } from './components/AIRecommendation';
import { StoryCreation } from './components/StoryCreation';
import { SavedArchive } from './components/SavedArchive';
import { ProfileScreen } from './components/ProfileScreen';
import {
  getActivitySaveKey,
  initialSavedActivities,
  type ActivitySaveRecord,
} from './activitySaveState';
import {
  initialStoryComments,
  type StoryComment,
  type StoryInteractionProps,
} from './storyInteractionState';
import { initialSearchState, type SearchState } from './searchState';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'search' | 'ai-recommendation' | 'story' | 'saved' | 'profile'>('home');
  const [savedActivityIds, setSavedActivityIds] = useState<string[]>(() =>
    initialSavedActivities.map(getActivitySaveKey)
  );
  const [savedActivityRecords, setSavedActivityRecords] = useState<Record<string, ActivitySaveRecord>>(() =>
    Object.fromEntries(initialSavedActivities.map((activity) => [getActivitySaveKey(activity), activity]))
  );
  const [likedStoryIds, setLikedStoryIds] = useState<number[]>([]);
  const [storyComments, setStoryComments] = useState<Record<number, StoryComment[]>>(initialStoryComments);
  const [searchState, setSearchState] = useState<SearchState>(initialSearchState);

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as any);
  };

  const handleHomeSearchSubmit = (values: Omit<SearchState, 'hasSearched'>) => {
    setSearchState({
      ...values,
      hasSearched: true,
    });
    setCurrentScreen('search');
  };

  const isActivitySaved = (activity: Pick<ActivitySaveRecord, 'title'> & { date?: string }) =>
    savedActivityIds.includes(getActivitySaveKey(activity));

  const handleToggleSavedActivity = (activity: ActivitySaveRecord) => {
    const activityKey = getActivitySaveKey(activity);

    setSavedActivityIds((currentIds) => {
      if (currentIds.includes(activityKey)) {
        return currentIds.filter((id) => id !== activityKey);
      }

      return [...currentIds, activityKey];
    });
    setSavedActivityRecords((currentRecords) => ({
      ...currentRecords,
      [activityKey]: activity,
    }));
  };

  const savedActivities = savedActivityIds
    .map((id) => savedActivityRecords[id])
    .filter((activity): activity is ActivitySaveRecord => Boolean(activity));

  const storyInteractions: StoryInteractionProps = {
    isStoryLiked: (storyId) => likedStoryIds.includes(storyId),
    getStoryLikeCount: (story) => story.likes + (likedStoryIds.includes(story.id) ? 1 : 0),
    getStoryCommentCount: (story) => storyComments[story.id]?.length ?? story.comments,
    getStoryComments: (storyId) => storyComments[storyId] ?? [],
    onToggleStoryLike: (storyId) => {
      setLikedStoryIds((currentIds) =>
        currentIds.includes(storyId)
          ? currentIds.filter((id) => id !== storyId)
          : [...currentIds, storyId]
      );
    },
    onAddStoryComment: (storyId, body) => {
      setStoryComments((currentComments) => {
        const comments = currentComments[storyId] ?? [];

        return {
          ...currentComments,
          [storyId]: [
            ...comments,
            {
              id: Date.now(),
              author: '나',
              body,
              time: '방금',
            },
          ],
        };
      });
    },
  };

  return (
    <div className="screen-transition">
      {currentScreen === 'home' && (
        <Home
          onNavigate={handleNavigate}
          onSearchSubmit={handleHomeSearchSubmit}
          isActivitySaved={isActivitySaved}
          onToggleSavedActivity={handleToggleSavedActivity}
        />
      )}
      {currentScreen === 'search' && (
        <SearchTab
          onNavigate={handleNavigate}
          searchState={searchState}
          onSearchStateChange={setSearchState}
          isActivitySaved={isActivitySaved}
          onToggleSavedActivity={handleToggleSavedActivity}
        />
      )}
      {currentScreen === 'ai-recommendation' && <AIRecommendation onNavigate={handleNavigate} />}
      {currentScreen === 'story' && <StoryCreation onNavigate={handleNavigate} storyInteractions={storyInteractions} />}
      {currentScreen === 'saved' && (
        <SavedArchive
          onNavigate={handleNavigate}
          savedActivities={savedActivities}
          isActivitySaved={isActivitySaved}
          onToggleSavedActivity={handleToggleSavedActivity}
          storyInteractions={storyInteractions}
        />
      )}
      {currentScreen === 'profile' && <ProfileScreen onNavigate={handleNavigate} />}
    </div>
  );
}
