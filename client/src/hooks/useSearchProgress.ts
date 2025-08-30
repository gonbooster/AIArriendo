import { useState, useEffect, useCallback } from 'react';

interface SearchProgressState {
  isSearching: boolean;
  progress: number;
  currentPhase: string;
  currentSource: string;
  sourcesCompleted: number;
  totalSources: number;
  propertiesFound: number;
  timeElapsed: number;
  estimatedTimeRemaining: number;
}

const SEARCH_PHASES = [
  'Iniciando búsqueda...',
  'Conectando con fuentes de datos...',
  'Extrayendo propiedades...',
  'Procesando resultados...',
  'Aplicando filtros...',
  'Finalizando búsqueda...'
];

const SOURCES = [
  'Fincaraiz',
  'Metrocuadrado', 
  'Trovit',
  'Ciencuadras',
  'MercadoLibre',
  'Rentola',
  'Properati',
  'PADS'
];

export const useSearchProgress = () => {
  const [state, setState] = useState<SearchProgressState>({
    isSearching: false,
    progress: 0,
    currentPhase: SEARCH_PHASES[0],
    currentSource: '',
    sourcesCompleted: 0,
    totalSources: SOURCES.length,
    propertiesFound: 0,
    timeElapsed: 0,
    estimatedTimeRemaining: 60
  });

  const [startTime, setStartTime] = useState<number>(0);

  const startSearch = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    setState(prev => ({
      ...prev,
      isSearching: true,
      progress: 0,
      currentPhase: SEARCH_PHASES[0],
      currentSource: '',
      sourcesCompleted: 0,
      propertiesFound: 0,
      timeElapsed: 0,
      estimatedTimeRemaining: 60
    }));
  }, []);

  const updateProgress = useCallback((updates: Partial<SearchProgressState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const completeSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSearching: false,
      progress: 100,
      currentPhase: '¡Búsqueda completada!',
      estimatedTimeRemaining: 0
    }));
  }, []);

  // Simulación realista del progreso
  useEffect(() => {
    if (!state.isSearching) return;

    const interval = setInterval(() => {
      setState(prev => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const newProgress = Math.min(95, prev.progress + Math.random() * 3);
        
        // Cambiar fase basado en progreso
        let phaseIndex = Math.floor((newProgress / 100) * SEARCH_PHASES.length);
        phaseIndex = Math.min(phaseIndex, SEARCH_PHASES.length - 1);
        
        // Cambiar fuente basado en progreso
        const sourceIndex = Math.floor((newProgress / 100) * SOURCES.length);
        const currentSource = sourceIndex < SOURCES.length ? SOURCES[sourceIndex] : '';
        
        // Calcular fuentes completadas
        const sourcesCompleted = Math.floor((newProgress / 100) * SOURCES.length);
        
        // Simular propiedades encontradas
        const propertiesFound = Math.floor(newProgress * 7.5); // ~750 propiedades al 100%
        
        // Estimar tiempo restante
        const estimatedTotal = elapsed > 0 ? (elapsed / newProgress) * 100 : 60;
        const estimatedTimeRemaining = Math.max(0, Math.floor(estimatedTotal - elapsed));

        return {
          ...prev,
          progress: newProgress,
          currentPhase: SEARCH_PHASES[phaseIndex],
          currentSource,
          sourcesCompleted,
          propertiesFound,
          timeElapsed: elapsed,
          estimatedTimeRemaining
        };
      });
    }, 500); // Actualizar cada 500ms

    return () => clearInterval(interval);
  }, [state.isSearching, startTime]);

  return {
    ...state,
    startSearch,
    updateProgress,
    completeSearch,
    SOURCES
  };
};
