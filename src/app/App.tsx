import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Home } from './components/Home';
import { SearchTab } from './components/SearchTab';
import { AIRecommendation } from './components/AIRecommendation';
import { StoryCreation } from './components/StoryCreation';
import { SavedArchive } from './components/SavedArchive';
import type { SavedArchiveTab } from './components/SavedArchive';
import { ProfileScreen } from './components/ProfileScreen';
import { EnhancedDetailBottomSheet } from './components/EnhancedDetailBottomSheet';
import { clearStaleScrollLock } from './components/useBottomSheetScrollLock';
import {
  getActivitySaveKey,
  initialSavedActivities,
  type ActivitySaveLookup,
  type ActivitySaveRecord,
} from './activitySaveState';
import {
  initialStoryComments,
  type StoryComment,
  type StoryInteractionProps,
} from './storyInteractionState';
import { initialSearchState, type SearchFormState, type SearchState } from './searchState';

type Screen = 'home' | 'search' | 'ai-recommendation' | 'story' | 'saved' | 'profile';
type SearchEntrySource = 'tab' | 'home-search';
type AIRecommendationState = 'closed' | 'open' | 'closing';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [savedActivityIds, setSavedActivityIds] = useState<string[]>(() =>
    initialSavedActivities.map(getActivitySaveKey)
  );
  const [savedActivityRecords, setSavedActivityRecords] = useState<Record<string, ActivitySaveRecord>>(() =>
    Object.fromEntries(initialSavedActivities.map((activity) => [getActivitySaveKey(activity), activity]))
  );
  const [likedStoryIds, setLikedStoryIds] = useState<number[]>([]);
  const [storyComments, setStoryComments] = useState<Record<number, StoryComment[]>>(initialStoryComments);
  const [searchState, setSearchState] = useState<SearchState>(initialSearchState);
  const [searchEntrySource, setSearchEntrySource] = useState<SearchEntrySource>('tab');
  const [aiRecommendationActivity, setAiRecommendationActivity] = useState<ActivitySaveRecord | null>(null);
  const [aiReturnScreen, setAiReturnScreen] = useState<Screen>('search');
  const [aiRecommendationState, setAIRecommendationState] = useState<AIRecommendationState>('closed');
  const [restoredDetailActivity, setRestoredDetailActivity] = useState<ActivitySaveRecord | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ message: string; isVisible: boolean } | null>(null);
  const [savedArchiveTab, setSavedArchiveTab] = useState<SavedArchiveTab>(0);
  const saveFeedbackTimers = useRef<number[]>([]);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentScreen]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(clearStaleScrollLock);
    return () => window.cancelAnimationFrame(frameId);
  }, [currentScreen, aiRecommendationState, restoredDetailActivity]);

  // --sison-viewport-height를 항상 최신 시각적 뷰포트 높이로 유지
  // 바텀시트가 열릴 때 레이아웃 깜빡임 방지 및 iOS Safari 주소창 변화 대응
  useEffect(() => {
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--sison-viewport-height', `${height}px`);
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('scroll', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('scroll', updateViewportHeight);
    };
  }, []);

  useEffect(() => () => {
    saveFeedbackTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const showSaveFeedback = (message: string) => {
    saveFeedbackTimers.current.forEach((timer) => window.clearTimeout(timer));
    saveFeedbackTimers.current = [];
    setSaveFeedback({ message, isVisible: true });

    const hideTimer = window.setTimeout(() => {
      setSaveFeedback((currentFeedback) =>
        currentFeedback ? { ...currentFeedback, isVisible: false } : currentFeedback
      );
    }, 1600);
    const clearTimer = window.setTimeout(() => {
      setSaveFeedback(null);
    }, 1850);

    saveFeedbackTimers.current = [hideTimer, clearTimer];
  };

  const handleNavigate = (
    screen: string,
    options?: { activity?: ActivitySaveRecord; returnScreen?: Screen; savedTab?: SavedArchiveTab }
  ) => {
    if (screen === 'ai-recommendation') {
      setAiRecommendationActivity(options?.activity ?? null);
      setAiReturnScreen(options?.returnScreen ?? currentScreen);
      setRestoredDetailActivity(null);
      setAIRecommendationState('open');
      return;
    }

    if (screen === 'search') {
      setSearchEntrySource('tab');
    }

    if (screen === 'saved' && options?.savedTab !== undefined) {
      setSavedArchiveTab(options.savedTab);
    }

    setCurrentScreen(screen as Screen);
  };

  const handleAIRecommendationBack = () => {
    setAIRecommendationState('closing');
  };

  const handleAIRecommendationExitComplete = useCallback(() => {
    setAIRecommendationState('closed');
    setCurrentScreen(aiReturnScreen);
    if (aiRecommendationActivity) {
      setRestoredDetailActivity(aiRecommendationActivity);
    }
  }, [aiRecommendationActivity, aiReturnScreen]);

  const handleHomeSearchSubmit = (values: SearchFormState) => {
    setSearchState((currentSearchState) => ({
      ...currentSearchState,
      ...values,
      hasSearched: true,
    }));
    setSearchEntrySource('home-search');
    setCurrentScreen('search');
  };

  const handleHomeSearchBack = () => {
    setSearchEntrySource('tab');
    setCurrentScreen('home');
  };

  const isActivitySaved = (activity: ActivitySaveLookup) =>
    savedActivityIds.some((savedId) => {
      if (savedId === getActivitySaveKey(activity)) return true;

      const savedActivity = savedActivityRecords[savedId];
      return savedActivity ? getActivitySaveKey(savedActivity) === getActivitySaveKey(activity) : false;
    });

  const handleToggleSavedActivity = (activity: ActivitySaveRecord) => {
    const activityKey = getActivitySaveKey(activity);
    const matchingSavedIds = savedActivityIds.filter((savedId) => {
      if (savedId === activityKey) return true;

      const savedActivity = savedActivityRecords[savedId];
      return savedActivity ? getActivitySaveKey(savedActivity) === activityKey : false;
    });
    const wasSaved = matchingSavedIds.length > 0;

    setSavedActivityIds((currentIds) => {
      const currentMatchingIds = currentIds.filter((savedId) => {
        if (savedId === activityKey) return true;

        const savedActivity = savedActivityRecords[savedId];
        return savedActivity ? getActivitySaveKey(savedActivity) === activityKey : false;
      });

      if (currentMatchingIds.length > 0) {
        return currentIds.filter((id) => !currentMatchingIds.includes(id));
      }

      return [...currentIds, activityKey];
    });
    setSavedActivityRecords((currentRecords) => {
      if (matchingSavedIds.length > 0) {
        const nextRecords = { ...currentRecords };
        matchingSavedIds.forEach((id) => {
          delete nextRecords[id];
        });
        return nextRecords;
      }

      return {
        ...currentRecords,
        [activityKey]: activity,
      };
    });
    showSaveFeedback(wasSaved ? '저장을 취소했어요.' : '저장했어요.');
  };

  const savedActivities = savedActivityIds.reduce<ActivitySaveRecord[]>((activities, id) => {
    const activity = savedActivityRecords[id];
    if (!activity) return activities;

    const activityKey = getActivitySaveKey(activity);
    const alreadyIncluded = activities.some((savedActivity) => getActivitySaveKey(savedActivity) === activityKey);
    if (alreadyIncluded) return activities;

    return [...activities, activity];
  }, []);

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
    onUpdateStoryComment: (storyId, commentId, body) => {
      const nextBody = body.trim();
      if (!nextBody) return;

      setStoryComments((currentComments) => {
        const comments = currentComments[storyId] ?? [];

        return {
          ...currentComments,
          [storyId]: comments.map((comment) =>
            comment.id === commentId && comment.author === '나'
              ? { ...comment, body: nextBody, edited: true }
              : comment
          ),
        };
      });
    },
    onDeleteStoryComment: (storyId, commentId) => {
      setStoryComments((currentComments) => {
        const comments = currentComments[storyId] ?? [];

        return {
          ...currentComments,
          [storyId]: comments.filter((comment) => comment.id !== commentId || comment.author !== '나'),
        };
      });
    },
    onRemoveStory: (storyId) => {
      setLikedStoryIds((currentIds) => currentIds.filter((id) => id !== storyId));
      setStoryComments((currentComments) => {
        if (!currentComments[storyId]) return currentComments;

        const nextComments = { ...currentComments };
        delete nextComments[storyId];
        return nextComments;
      });
    },
  };

  return (
    <div className="screen-transition">
      <div style={{ display: currentScreen === 'home' ? '' : 'none' }}>
        <Home
          onNavigate={handleNavigate}
          onSearchSubmit={handleHomeSearchSubmit}
          isActivitySaved={isActivitySaved}
          onToggleSavedActivity={handleToggleSavedActivity}
        />
      </div>
      <div style={{ display: currentScreen === 'search' ? '' : 'none' }}>
        <SearchTab
          onNavigate={handleNavigate}
          searchState={searchState}
          entrySource={searchEntrySource}
          onHomeSearchBack={handleHomeSearchBack}
          onSearchStateChange={setSearchState}
          isActivitySaved={isActivitySaved}
          onToggleSavedActivity={handleToggleSavedActivity}
        />
      </div>
      {aiRecommendationState !== 'closed' && (
        <AIRecommendation
          activity={aiRecommendationActivity}
          isOpen={aiRecommendationState === 'open'}
          onBack={handleAIRecommendationBack}
          onExitComplete={handleAIRecommendationExitComplete}
        />
      )}
      {currentScreen === 'story' && <StoryCreation onNavigate={handleNavigate} storyInteractions={storyInteractions} />}
      {currentScreen === 'saved' && (
        <SavedArchive
          onNavigate={handleNavigate}
          savedActivities={savedActivities}
          isActivitySaved={isActivitySaved}
          onToggleSavedActivity={handleToggleSavedActivity}
          storyInteractions={storyInteractions}
          activeArchiveTab={savedArchiveTab}
          onArchiveTabChange={setSavedArchiveTab}
        />
      )}
      {currentScreen === 'profile' && <ProfileScreen onNavigate={handleNavigate} />}

      {restoredDetailActivity && aiRecommendationState === 'closed' && (
        <EnhancedDetailBottomSheet
          isOpen
          onClose={() => setRestoredDetailActivity(null)}
          onAIRecommendation={(activity) => {
            setRestoredDetailActivity(null);
            handleNavigate('ai-recommendation', {
              activity,
              returnScreen: currentScreen,
            });
          }}
          isSaved={isActivitySaved(restoredDetailActivity)}
          onToggleSaved={() => handleToggleSavedActivity(restoredDetailActivity)}
          disableEntryAnimation
          activity={restoredDetailActivity}
        />
      )}

      {saveFeedback && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[80] flex justify-center px-5">
          <div
            className={`rounded-full border border-white/45 bg-[#2f3430]/88 px-4 py-2 text-[12.5px] font-medium text-white shadow-[0_8px_24px_rgba(34,39,34,0.16)] backdrop-blur-md transition-all duration-200 ease-out ${
              saveFeedback.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
            role="status"
            aria-live="polite"
          >
            {saveFeedback.message}
          </div>
        </div>
      )}
    </div>
  );
}
