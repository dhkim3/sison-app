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
  type ActivitySaveLookup,
  type ActivitySaveRecord,
} from './activitySaveState';
import {
  getDeviceKey,
  initialStoryComments,
  storyApi,
  type StoryCardItem,
  type StoryComment,
  type StoryInteractionProps,
} from './storyInteractionState';
import type { StoryItem } from './components/story/storyTypes';
import {
  addRecentSearch,
  initialSearchState,
  resetSearchViewState,
  type SearchFormState,
  type SearchState,
} from './searchState';
import { resolveSearchLocation } from './travelPlaceAliases';
import { scrollToTop } from './utils/scrollToTop';

type Screen = 'home' | 'search' | 'ai-recommendation' | 'story' | 'saved' | 'profile';
type SearchEntrySource = 'tab' | 'home-search';
type AIRecommendationState = 'closed' | 'open' | 'closing';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [savedActivityIds, setSavedActivityIds] = useState<string[]>([]);
  const [savedActivityRecords, setSavedActivityRecords] = useState<Record<string, ActivitySaveRecord>>({});
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
  const [deviceKey] = useState(() => getDeviceKey());
  const [userStories, setUserStories] = useState<StoryItem[]>([]);
  const [profileNickname, setProfileNickname] = useState('여행자');
  const [pendingCardStory, setPendingCardStory] = useState<StoryItem | null>(null);
  const [myCards, setMyCards] = useState<StoryCardItem[]>([]);
  const saveFeedbackTimers = useRef<number[]>([]);

  useLayoutEffect(() => {
    scrollToTop();
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

  // DB에서 스토리/좋아요/댓글/카드 복원 (시드 댓글 위에 DB 댓글을 덧붙임)
  const loadStories = useCallback(() => {
    if (!deviceKey) return;
    storyApi
      .list(deviceKey)
      .then((data) => {
        setUserStories(data.stories);
        setLikedStoryIds(data.likedStoryIds);
        setMyCards(data.cards);
        setStoryComments((currentComments) => {
          const merged: Record<number, StoryComment[]> = { ...currentComments };
          for (const [storyId, list] of Object.entries(data.comments)) {
            const id = Number(storyId);
            merged[id] = [...(initialStoryComments[id] ?? []), ...list];
          }
          return merged;
        });
      })
      .catch((error) => console.error('story list load failed', error));
  }, [deviceKey]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // 저장 화면에 들어올 때마다 최신 내 스토리/카드를 다시 불러와 반영
  useEffect(() => {
    if (currentScreen === 'saved') loadStories();
  }, [currentScreen, loadStories]);

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
    options?: { activity?: ActivitySaveRecord; returnScreen?: Screen; savedTab?: SavedArchiveTab; cardStory?: StoryItem }
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

    if (screen === 'story' && options?.cardStory) {
      setPendingCardStory(options.cardStory);
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
    const resolved = resolveSearchLocation(values.destination);
    setSearchState((currentSearchState) => ({
      ...currentSearchState,
      ...values,
      hasSearched: true,
      recentSearches: addRecentSearch(currentSearchState.recentSearches ?? [], {
        ...values,
        resolvedSidoCd: resolved?.sidoCd ?? null,
        resolvedGugunCd: resolved?.gugunCd ?? null,
        resolvedKeywords: resolved?.keywords ?? null,
      }),
    }));
    setSearchEntrySource('home-search');
    setCurrentScreen('search');
  };

  const handleHomeSearchBack = () => {
    setSearchState((currentSearchState) => resetSearchViewState(currentSearchState));
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

  const handleCreateStory = (story: StoryItem) => {
    const ownedStory: StoryItem = { ...story, author: profileNickname, authorName: profileNickname, isMine: true };
    setUserStories((current) => [ownedStory, ...current]);
    if (deviceKey) {
      storyApi.createStory(deviceKey, ownedStory).catch((error) => console.error('create story failed', error));
    }
  };

  const handleDeleteStory = (story: StoryItem) => {
    setUserStories((current) => current.filter((item) => item.id !== story.id));
    setLikedStoryIds((currentIds) => currentIds.filter((id) => id !== story.id));
    setStoryComments((currentComments) => {
      if (!currentComments[story.id]) return currentComments;
      const nextComments = { ...currentComments };
      delete nextComments[story.id];
      return nextComments;
    });
    if (deviceKey) {
      storyApi.deleteStory(deviceKey, story.id).catch((error) => console.error('delete story failed', error));
    }
  };

  const storyInteractions: StoryInteractionProps = {
    isStoryLiked: (storyId) => likedStoryIds.includes(storyId),
    getStoryLikeCount: (story) => story.likes + (likedStoryIds.includes(story.id) ? 1 : 0),
    getStoryCommentCount: (story) => storyComments[story.id]?.length ?? story.comments,
    getStoryComments: (storyId) => storyComments[storyId] ?? [],
    onToggleStoryLike: (storyId) => {
      const isLiked = likedStoryIds.includes(storyId);
      setLikedStoryIds((currentIds) =>
        currentIds.includes(storyId)
          ? currentIds.filter((id) => id !== storyId)
          : [...currentIds, storyId],
      );
      if (deviceKey) {
        (isLiked ? storyApi.unlike : storyApi.like)(deviceKey, storyId).catch((error) =>
          console.error('like sync failed', error),
        );
      }
    },
    onAddStoryComment: (storyId, body) => {
      const text = body.trim();
      if (!text) return;

      const tempId = Date.now();
      setStoryComments((currentComments) => {
        const comments = currentComments[storyId] ?? [];
        return {
          ...currentComments,
          [storyId]: [...comments, { id: tempId, author: profileNickname, body: text, time: '방금', isMine: true }],
        };
      });

      if (deviceKey) {
        storyApi
          .addComment(deviceKey, storyId, profileNickname, text)
          .then((response) => {
            const real = (response as { comment?: StoryComment }).comment;
            if (!real) return;
            setStoryComments((currentComments) => ({
              ...currentComments,
              [storyId]: (currentComments[storyId] ?? []).map((comment) =>
                comment.id === tempId ? { ...comment, id: real.id, time: real.time, isMine: true } : comment,
              ),
            }));
          })
          .catch((error) => console.error('add comment failed', error));
      }
    },
    onUpdateStoryComment: (storyId, commentId, body) => {
      const nextBody = body.trim();
      if (!nextBody) return;

      setStoryComments((currentComments) => {
        const comments = currentComments[storyId] ?? [];

        return {
          ...currentComments,
          [storyId]: comments.map((comment) =>
            comment.id === commentId && comment.isMine
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
          [storyId]: comments.filter((comment) => !(comment.id === commentId && comment.isMine)),
        };
      });

      if (deviceKey) {
        storyApi.deleteComment(deviceKey, commentId).catch((error) => console.error('delete comment failed', error));
      }
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
          recentSearches={searchState.recentSearches}
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
      {currentScreen === 'story' && (
        <StoryCreation
          onNavigate={handleNavigate}
          storyInteractions={storyInteractions}
          userStories={userStories}
          profileNickname={profileNickname}
          onCreateStory={handleCreateStory}
          onDeleteStory={handleDeleteStory}
          pendingCardStory={pendingCardStory}
          onPendingCardConsumed={() => setPendingCardStory(null)}
        />
      )}
      {currentScreen === 'saved' && (
        <SavedArchive
          onNavigate={handleNavigate}
          savedActivities={savedActivities}
          isActivitySaved={isActivitySaved}
          onToggleSavedActivity={handleToggleSavedActivity}
          storyInteractions={storyInteractions}
          activeArchiveTab={savedArchiveTab}
          onArchiveTabChange={setSavedArchiveTab}
          myStories={userStories.filter((story) => story.isMine)}
          myCards={myCards}
        />
      )}
      {currentScreen === 'profile' && (
        <ProfileScreen
          onNavigate={handleNavigate}
          nickname={profileNickname}
          onNicknameChange={setProfileNickname}
        />
      )}

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
