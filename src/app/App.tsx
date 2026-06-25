import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Home } from './components/Home';
import { SearchTab } from './components/SearchTab';
import { AIRecommendation } from './components/AIRecommendation';
import { StoryCreation } from './components/StoryCreation';
import { initialArchiveStories, initialTravelCards, SavedArchive } from './components/SavedArchive';
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
import { getAIFrameJobById, useAIFrameJobs } from './aiFrameJobState';
import { avoidConsecutiveActivityImages } from './utils/activityImage';

type Screen = 'home' | 'search' | 'ai-recommendation' | 'story' | 'saved' | 'profile';
type SearchEntrySource = 'tab' | 'home-search';
type AIRecommendationState = 'closed' | 'open' | 'closing';
type StoryViewState = 'map' | 'my-activities' | 'upload' | 'card' | null;
type AIFrameJobToast = { jobId: string; status: 'ready' | 'error' };

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
  const [pendingAIFrameJobId, setPendingAIFrameJobId] = useState<string | null>(null);
  const [storyView, setStoryView] = useState<StoryViewState>(null);
  const [activeAIFrameTargetKey, setActiveAIFrameTargetKey] = useState<string | null>(null);
  const [aiFrameJobToast, setAIFrameJobToast] = useState<AIFrameJobToast | null>(null);
  const [myCards, setMyCards] = useState<StoryCardItem[]>([]);
  const [localSavedTravelCards, setLocalSavedTravelCards] = useState<StoryCardItem[]>([]);
  const [dismissedArchiveStoryIds, setDismissedArchiveStoryIds] = useState<number[]>([]);
  const [deletedStoryIds, setDeletedStoryIds] = useState<string[]>([]);
  const [deletedTravelCardIds, setDeletedTravelCardIds] = useState<string[]>([]);
  const [dismissedAIFrameJobIds, setDismissedAIFrameJobIds] = useState<string[]>([]);
  const saveFeedbackTimers = useRef<number[]>([]);
  const seenAIFrameJobStatusesRef = useRef<Record<string, string>>({});
  const aiFrameJobs = useAIFrameJobs();

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

  useEffect(() => {
    for (const job of aiFrameJobs) {
      if (!job.completedAt || job.superseded) continue;
      if (job.status !== 'ready' && job.status !== 'error') continue;
      if (dismissedAIFrameJobIds.includes(job.jobId)) continue;

      const statusKey = `${job.status}:${job.completedAt}`;
      if (seenAIFrameJobStatusesRef.current[job.jobId] === statusKey) continue;

      seenAIFrameJobStatusesRef.current[job.jobId] = statusKey;
      const isViewingSameCard =
        currentScreen === 'story' &&
        storyView === 'card' &&
        activeAIFrameTargetKey === job.targetKey;

      if (!isViewingSameCard) {
        setAIFrameJobToast({ jobId: job.jobId, status: job.status });
      }
      break;
    }
  }, [activeAIFrameTargetKey, aiFrameJobs, currentScreen, dismissedAIFrameJobIds, storyView]);

  // Vercel Blob manifest에서 공용 스토리/여행카드 목록 복원
  const loadStories = useCallback(() => {
    if (!deviceKey) return;
    storyApi
      .list(deviceKey)
      .then((data) => {
        setUserStories(data.stories);
        setLikedStoryIds(data.likedStoryIds);
        setMyCards(data.cards);
        setDeletedStoryIds(data.deletedStoryIds);
        setDeletedTravelCardIds(data.deletedCardIds);
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

  const getResumableAIFrameJob = () =>
    aiFrameJobs
      .filter((job) =>
        (job.status === 'generating' || job.status === 'ready') &&
        !job.superseded &&
        !dismissedAIFrameJobIds.includes(job.jobId)
      )
      .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;

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

    if (screen === 'story' && !options?.cardStory) {
      const resumableJob = getResumableAIFrameJob();
      if (resumableJob) {
        setPendingAIFrameJobId(resumableJob.jobId);
      }
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
  const resolvedSavedActivities = avoidConsecutiveActivityImages(savedActivities);

  const savedTravelCards = [
    ...localSavedTravelCards,
    ...myCards.filter((card) => !localSavedTravelCards.some((localCard) => String(localCard.id) === String(card.id))),
  ].filter((card) => !deletedTravelCardIds.includes(String(card.id)));
  const profileStoryCount = (() => {
    const deleted = new Set([...(dismissedArchiveStoryIds ?? []).map(String), ...deletedStoryIds]);
    const seen = new Set<number>();
    return [...userStories, ...initialArchiveStories].filter((story) => {
      if (deleted.has(String(story.id))) return false;
      if (seen.has(story.id)) return false;
      seen.add(story.id);
      return true;
    }).length;
  })();
  const profileTravelCardCount = (() => {
    const deleted = new Set(deletedTravelCardIds);
    const seen = new Set<string>();
    return [...savedTravelCards, ...initialTravelCards].filter((card) => {
      if (deleted.has(String(card.id))) return false;
      if (seen.has(String(card.id))) return false;
      seen.add(String(card.id));
      return true;
    }).length;
  })();
  const activeGeneratingAIFrameJob = aiFrameJobs
    .filter((job) => job.status === 'generating' && !job.superseded && !dismissedAIFrameJobIds.includes(job.jobId))
    .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
  const isViewingGeneratingAIFrameCard =
    !!activeGeneratingAIFrameJob &&
    currentScreen === 'story' &&
    storyView === 'card' &&
    activeAIFrameTargetKey === activeGeneratingAIFrameJob.targetKey;
  const shouldShowAIFrameGlobalBar = !!activeGeneratingAIFrameJob && !isViewingGeneratingAIFrameCard;

  const handleCreateStory = async (story: StoryItem) => {
    const ownedStory: StoryItem = { ...story, author: profileNickname, authorName: profileNickname, isMine: true };
    if (deviceKey) {
      const savedStory = await storyApi.createStory(deviceKey, ownedStory);
      const nextStory: StoryItem = { ...ownedStory, ...savedStory, isMine: true };
      setUserStories((current) => [nextStory, ...current.filter((item) => item.id !== nextStory.id)]);
      loadStories();
      return;
    }
    throw new Error('기기 식별값을 확인하지 못했어요.');
  };

  const handleDeleteStory = (story: StoryItem) => {
    setUserStories((current) => current.filter((item) => item.id !== story.id));
    setDeletedStoryIds((currentIds) => (
      currentIds.includes(String(story.id)) ? currentIds : [...currentIds, String(story.id)]
    ));
    setLikedStoryIds((currentIds) => currentIds.filter((id) => id !== story.id));
    setStoryComments((currentComments) => {
      if (!currentComments[story.id]) return currentComments;
      const nextComments = { ...currentComments };
      delete nextComments[story.id];
      return nextComments;
    });
    setDismissedArchiveStoryIds((currentIds) =>
      currentIds.includes(story.id) ? currentIds : [...currentIds, story.id],
    );
    if (deviceKey) {
      storyApi
        .deleteStory(deviceKey, story.id)
        .then(() => loadStories())
        .catch((error) => console.error('delete story failed', error));
    }
  };

  const handleSaveTravelCard = (card: StoryCardItem) => {
    setLocalSavedTravelCards((currentCards) => {
      const nextCards = currentCards.filter((currentCard) => String(currentCard.id) !== String(card.id));

      return [card, ...nextCards];
    });
    window.setTimeout(loadStories, 0);
  };

  const handleDeleteTravelCard = async (cardId: string | number) => {
    const id = String(cardId);

    if (deviceKey) {
      await storyApi.deleteCard(deviceKey, id);
    }

    setDeletedTravelCardIds((currentIds) => (currentIds.includes(id) ? currentIds : [...currentIds, id]));
    setLocalSavedTravelCards((currentCards) => currentCards.filter((card) => String(card.id) !== id));
    setMyCards((currentCards) => currentCards.filter((card) => String(card.id) !== id));

    if (deviceKey) {
      window.setTimeout(loadStories, 0);
    }
  };

  const handleDismissAIFrameJob = (jobId: string) => {
    setDismissedAIFrameJobIds((currentIds) => (
      currentIds.includes(jobId) ? currentIds : [...currentIds, jobId]
    ));
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
          deletedStoryIds={deletedStoryIds}
          profileNickname={profileNickname}
          onCreateStory={handleCreateStory}
          onDeleteStory={handleDeleteStory}
          pendingCardStory={pendingCardStory}
          onPendingCardConsumed={() => setPendingCardStory(null)}
          pendingAIFrameJobId={pendingAIFrameJobId}
          onPendingAIFrameJobConsumed={() => setPendingAIFrameJobId(null)}
          onStoryViewChange={setStoryView}
          onActiveAIFrameTargetChange={setActiveAIFrameTargetKey}
          onSaveTravelCard={handleSaveTravelCard}
          onDismissAIFrameJob={handleDismissAIFrameJob}
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
          myStories={userStories}
          myCards={savedTravelCards}
          dismissedArchiveStoryIds={dismissedArchiveStoryIds}
          deletedStoryIds={deletedStoryIds}
          deletedTravelCardIds={deletedTravelCardIds}
          onDeleteArchiveStory={handleDeleteStory}
          onDeleteTravelCard={handleDeleteTravelCard}
        />
      )}
      {currentScreen === 'profile' && (
        <ProfileScreen
          onNavigate={handleNavigate}
          nickname={profileNickname}
          onNicknameChange={setProfileNickname}
          savedActivityCount={resolvedSavedActivities.length}
          storyCount={profileStoryCount}
          travelCardCount={profileTravelCardCount}
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

      {shouldShowAIFrameGlobalBar && activeGeneratingAIFrameJob && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-5"
          style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <button
            type="button"
            onClick={() => {
              setPendingAIFrameJobId(activeGeneratingAIFrameJob.jobId);
              setCurrentScreen('story');
            }}
            className="ai-frame-global-bar pointer-events-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#d9ccff] bg-[#f4efff]/95 px-3.5 text-[12.5px] font-semibold text-[#5f4bdb] shadow-[0_6px_18px_rgba(95,75,219,0.10)] backdrop-blur-md transition-colors hover:bg-[#eee7ff]"
            aria-label="AI 프레임 생성 중인 카드로 이동"
          >
            <Sparkles className="ai-frame-global-bar-icon h-3.5 w-3.5" strokeWidth={2} />
            <span>AI 프레임 생성 중</span>
          </button>
        </div>
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

      {aiFrameJobToast && (
        <div className="fixed inset-x-0 bottom-[92px] z-[95] flex justify-center px-5">
          <div
            className="w-full max-w-[360px] rounded-2xl border border-white/55 bg-[#2f3430]/92 px-4 py-3 text-white shadow-[0_10px_30px_rgba(34,39,34,0.18)] backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-5">
                  {aiFrameJobToast.status === 'ready' ? 'AI 프레임이 완성됐어요' : 'AI 프레임 생성에 실패했어요'}
                </p>
                <p className="text-[11.5px] leading-4 text-white/70">
                  {aiFrameJobToast.status === 'ready' ? '지금 확인해볼까요?' : '다시 시도해볼까요?'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAIFrameJobToast(null)}
                  className="rounded-full px-2.5 py-1.5 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  나중에
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const job = getAIFrameJobById(aiFrameJobToast.jobId);
                    if (job) {
                      setPendingAIFrameJobId(job.jobId);
                      setCurrentScreen('story');
                    }
                    setAIFrameJobToast(null);
                  }}
                  className="rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#4f46c8] transition-colors hover:bg-[#f3eeff]"
                >
                  {aiFrameJobToast.status === 'ready' ? '보러가기' : '다시 시도'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
