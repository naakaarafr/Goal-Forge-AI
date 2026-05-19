import { StateCreator } from 'zustand';
import { ACTIVE_QUARTER } from '@/hooks/api/useGoals';

export interface FilterState {
  quarter: string;
  status: string | null;
  searchQuery: string;
}

export interface FilterSlice {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string | null) => void;
  resetFilters: () => void;
}

/** Computes the current fiscal quarter string. */
function getCurrentQuarter(): string {
  return ACTIVE_QUARTER;
}

const defaultFilters: FilterState = {
  quarter: getCurrentQuarter(),
  status: null,
  searchQuery: '',
};

export const createFilterSlice: StateCreator<FilterSlice> = (set) => ({
  filters: defaultFilters,
  
  setFilter: (key, value) => set((state) => ({
    filters: {
      ...state.filters,
      [key]: value
    }
  })),

  resetFilters: () => set({ filters: defaultFilters }),
});
