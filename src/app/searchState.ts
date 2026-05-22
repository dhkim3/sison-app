export interface SearchState {
  destination: string;
  startDate: Date | null;
  endDate: Date | null;
  dateRangeLabel: string;
  peopleCount: number;
  hasSearched: boolean;
}

export const initialSearchState: SearchState = {
  destination: '',
  startDate: null,
  endDate: null,
  dateRangeLabel: '',
  peopleCount: 0,
  hasSearched: false,
};
