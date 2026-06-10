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
};

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

export const initialSearchState: SearchState = {
  destination: '',
  startDate: null,
  endDate: null,
  dateRangeLabel: '',
  peopleCount: 0,
  hasSearched: false,
  api: initialSearchApiState,
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
