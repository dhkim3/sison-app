import type { ActivitySaveRecord } from './activitySaveState';

export interface SearchCondition {
  destination: string;
  startDate: Date | null;
  endDate: Date | null;
  peopleCount: number;
  filter?: string;
  sort?: string;
  page?: number;
}

export type SearchFormState = Pick<
  SearchCondition,
  'destination' | 'startDate' | 'endDate' | 'peopleCount'
> & {
  dateRangeLabel: string;
  resolvedSidoCd?: string | null;
  resolvedGugunCd?: string | null;
  resolvedKeywords?: string[] | null;
};

export interface RecentSearchItem {
  id: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  peopleCount?: number | null;
  createdAt: number;
  resolvedSidoCd?: string | null;
  resolvedGugunCd?: string | null;
  resolvedKeywords?: string[] | null;
}

export interface SearchApiState {
  lastSearchKey: string | null;
  pendingSearchKey: string | null;
  failedSearchKey: string | null;
  lastSuccessfulSearchCondition: SearchCondition | null;
  results: ActivitySaveRecord[];
  totalCount: number;
  currentPage: number;
  hasSearched: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

export interface SearchState {
  destination: string;
  startDate: Date | null;
  endDate: Date | null;
  dateRangeLabel: string;
  peopleCount: number;
  hasSearched: boolean;
  recentSearches: RecentSearchItem[];
  api: SearchApiState;
}

export const initialSearchApiState: SearchApiState = {
  lastSearchKey: null,
  pendingSearchKey: null,
  failedSearchKey: null,
  lastSuccessfulSearchCondition: null,
  results: [],
  totalCount: 0,
  currentPage: 1,
  hasSearched: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

const RECENT_SEARCH_LIMIT = 8;

const formatRecentSearchDateValue = (date: Date | null | undefined) => {
  if (!date) return null;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const parseRecentSearchDateValue = (value?: string | null) => {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const formatRecentSearchDisplayDate = (value?: string | null) => {
  const date = parseRecentSearchDateValue(value);
  if (!date) return '';

  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const createRecentSearchId = (
  destination: string,
  startDate?: string | null,
  endDate?: string | null,
  peopleCount?: number | null,
) => {
  return [
    destination.trim().toLowerCase(),
    startDate || '',
    endDate || '',
    peopleCount || '',
  ].join('|');
};

type RecentSearchCondition = Pick<SearchCondition, 'destination' | 'startDate' | 'endDate' | 'peopleCount'> & {
  resolvedSidoCd?: string | null;
  resolvedGugunCd?: string | null;
  resolvedKeywords?: string[] | null;
};

const createRecentSearchItem = (
  condition: RecentSearchCondition,
  createdAt: number,
): RecentSearchItem | null => {
  const destination = condition.destination.trim();
  if (!destination) return null;

  const startDate = formatRecentSearchDateValue(condition.startDate);
  const endDate = formatRecentSearchDateValue(condition.endDate);
  const peopleCount = condition.peopleCount > 0 ? condition.peopleCount : null;

  return {
    id: createRecentSearchId(destination, startDate, endDate, peopleCount),
    destination,
    startDate,
    endDate,
    peopleCount,
    createdAt,
    resolvedSidoCd: condition.resolvedSidoCd ?? null,
    resolvedGugunCd: condition.resolvedGugunCd ?? null,
    resolvedKeywords: condition.resolvedKeywords ?? null,
  };
};

export const addRecentSearch = (
  recentSearches: RecentSearchItem[],
  condition: RecentSearchCondition,
) => {
  const nextItem = createRecentSearchItem(condition, Date.now());
  if (!nextItem) return recentSearches;

  return [
    nextItem,
    ...recentSearches.filter((item) => item.id !== nextItem.id),
  ].slice(0, RECENT_SEARCH_LIMIT);
};

export const selectRecentSearch = (item: RecentSearchItem): SearchFormState => {
  const startDate = parseRecentSearchDateValue(item.startDate);
  const endDate = parseRecentSearchDateValue(item.endDate);

  return {
    destination: item.destination,
    startDate,
    endDate,
    dateRangeLabel: startDate && endDate ? formatSearchDateRangeFull(startDate, endDate) : '',
    peopleCount: item.peopleCount || 0,
    resolvedSidoCd: item.resolvedSidoCd ?? null,
    resolvedGugunCd: item.resolvedGugunCd ?? null,
    resolvedKeywords: item.resolvedKeywords ?? null,
  };
};

export const formatRecentSearchShort = (item: RecentSearchItem) => item.destination;

export const formatRecentSearchFull = (item: RecentSearchItem) => {
  const startLabel = formatRecentSearchDisplayDate(item.startDate);
  const endLabel = formatRecentSearchDisplayDate(item.endDate);
  const dateLabel = startLabel && endLabel
    ? `${startLabel}-${endLabel}`
    : startLabel || endLabel;
  const peopleLabel = item.peopleCount ? `${item.peopleCount}명` : '';

  return [item.destination, dateLabel, peopleLabel].filter(Boolean).join(' · ');
};

export const initialSearchState: SearchState = {
  destination: '',
  startDate: null,
  endDate: null,
  dateRangeLabel: '',
  peopleCount: 0,
  hasSearched: false,
  recentSearches: [],
  api: initialSearchApiState,
};

export const resetSearchViewState = (currentState: SearchState): SearchState => ({
  ...initialSearchState,
  recentSearches: currentState.recentSearches,
  api: {
    ...initialSearchApiState,
    results: [],
  },
});

export const formatSearchDateRangeFull = (start: Date, end: Date) => {
  return `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')} - ${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`;
};

const formatSearchKeyDate = (date: Date | null) => {
  if (!date) return '';

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
};

export const createSearchKey = ({
  destination,
  startDate,
  endDate,
  peopleCount,
  filter = '',
  sort = '',
  page = 1,
}: SearchCondition) => {
  return [
    destination.trim(),
    formatSearchKeyDate(startDate),
    formatSearchKeyDate(endDate),
    peopleCount || '',
    filter,
    sort,
    page,
  ].join('|');
};
