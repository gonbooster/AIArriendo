import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { SearchCriteria, SearchResult, SearchFilters, Property } from '../types';

interface SearchState {
  criteria: SearchCriteria;
  results: SearchResult | null;
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
  favorites: string[];
  recentSearches: SearchCriteria[];
}

type SearchAction =
  | { type: 'SET_CRITERIA'; payload: SearchCriteria }
  | { type: 'SET_RESULTS'; payload: SearchResult }
  | { type: 'SET_FILTERS'; payload: Partial<SearchFilters> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_FAVORITE'; payload: string }
  | { type: 'REMOVE_FAVORITE'; payload: string }
  | { type: 'ADD_RECENT_SEARCH'; payload: SearchCriteria }
  | { type: 'CLEAR_RESULTS' };

const initialCriteria: SearchCriteria = {
  minRooms: 3,
  minArea: 70,
  maxPrice: 3500000,
  allowAdminOverage: true,
  location: {
    minStreet: 100,
    maxStreet: 170,
    minCarrera: 7,
    maxCarrera: 25,
    zones: ['Norte']
  },
  preferences: {
    wetAreas: [
      { name: 'jacuzzi', priority: 'nice' as const },
      { name: 'sauna', priority: 'nice' as const },
      { name: 'turco', priority: 'essential' as const }
    ],
    sports: [
      { name: 'padel', priority: 'nice' as const },
      { name: 'cancha de padel', priority: 'essential' as const }
    ],
    amenities: [
      { name: 'gimnasio', priority: 'nice' as const },
      { name: 'piscina', priority: 'essential' as const },
      { name: 'salon social', priority: 'nice' as const }
    ]
  }
};

const initialFilters: SearchFilters = {
  sortBy: 'score',
  sortOrder: 'desc',
  sources: [],
  neighborhoods: [],
  amenities: []
};

const initialState: SearchState = {
  criteria: initialCriteria,
  results: null,
  filters: initialFilters,
  loading: false,
  error: null,
  favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
  recentSearches: JSON.parse(localStorage.getItem('recentSearches') || '[]')
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_CRITERIA':
      return { ...state, criteria: action.payload };
    
    case 'SET_RESULTS':
      return { ...state, results: action.payload, loading: false, error: null };
    
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'ADD_FAVORITE':
      const newFavorites = [...state.favorites, action.payload];
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      return { ...state, favorites: newFavorites };
    
    case 'REMOVE_FAVORITE':
      const filteredFavorites = state.favorites.filter(id => id !== action.payload);
      localStorage.setItem('favorites', JSON.stringify(filteredFavorites));
      return { ...state, favorites: filteredFavorites };
    
    case 'ADD_RECENT_SEARCH':
      const newRecentSearches = [
        action.payload,
        ...state.recentSearches.filter(search => 
          JSON.stringify(search) !== JSON.stringify(action.payload)
        )
      ].slice(0, 10); // Keep only last 10 searches
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
      return { ...state, recentSearches: newRecentSearches };
    
    case 'CLEAR_RESULTS':
      return { ...state, results: null, error: null };
    
    default:
      return state;
  }
}

interface SearchContextType {
  state: SearchState;
  setCriteria: (criteria: SearchCriteria) => void;
  setResults: (results: SearchResult) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addFavorite: (propertyId: string) => void;
  removeFavorite: (propertyId: string) => void;
  isFavorite: (propertyId: string) => boolean;
  addRecentSearch: (criteria: SearchCriteria) => void;
  clearResults: () => void;
  getFilteredProperties: () => Property[];
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const setCriteria = (criteria: SearchCriteria) => {
    dispatch({ type: 'SET_CRITERIA', payload: criteria });
  };

  const setResults = (results: SearchResult) => {
    dispatch({ type: 'SET_RESULTS', payload: results });
  };

  const setFilters = (filters: Partial<SearchFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const addFavorite = (propertyId: string) => {
    dispatch({ type: 'ADD_FAVORITE', payload: propertyId });
  };

  const removeFavorite = (propertyId: string) => {
    dispatch({ type: 'REMOVE_FAVORITE', payload: propertyId });
  };

  const isFavorite = (propertyId: string) => {
    return state.favorites.includes(propertyId);
  };

  const addRecentSearch = (criteria: SearchCriteria) => {
    dispatch({ type: 'ADD_RECENT_SEARCH', payload: criteria });
  };

  const clearResults = () => {
    dispatch({ type: 'CLEAR_RESULTS' });
  };

  const getFilteredProperties = (): Property[] => {
    if (!state.results) return [];

    let properties = [...state.results.properties];

    // Apply source filter
    if (state.filters.sources.length > 0) {
      properties = properties.filter(p => state.filters.sources.includes(p.source));
    }

    // Apply neighborhood filter
    if (state.filters.neighborhoods.length > 0) {
      properties = properties.filter(p => 
        p.location.neighborhood && 
        state.filters.neighborhoods.includes(p.location.neighborhood)
      );
    }

    // Apply amenities filter
    if (state.filters.amenities.length > 0) {
      properties = properties.filter(p =>
        state.filters.amenities.some(amenity =>
          p.amenities.some(pAmenity => 
            pAmenity.toLowerCase().includes(amenity.toLowerCase())
          )
        )
      );
    }

    // Apply sorting
    properties.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (state.filters.sortBy) {
        case 'price':
          aValue = a.totalPrice;
          bValue = b.totalPrice;
          break;
        case 'pricePerM2':
          aValue = a.pricePerM2;
          bValue = b.pricePerM2;
          break;
        case 'area':
          aValue = a.area;
          bValue = b.area;
          break;
        case 'score':
          aValue = a.score || 0;
          bValue = b.score || 0;
          break;
        case 'date':
          aValue = new Date(a.scrapedDate).getTime();
          bValue = new Date(b.scrapedDate).getTime();
          break;
        default:
          return 0;
      }

      return state.filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return properties;
  };

  const value: SearchContextType = {
    state,
    setCriteria,
    setResults,
    setFilters,
    setLoading,
    setError,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecentSearch,
    clearResults,
    getFilteredProperties
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
