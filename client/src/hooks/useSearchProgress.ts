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
  '🚀 Encendiendo los motores de búsqueda...',
  '🕵️ Infiltrándonos en las páginas inmobiliarias...',
  '🏠 Cazando propiedades como un ninja...',
  '🤖 Los robots están trabajando duro por ti...',
  '🔍 Analizando cada rincón...',
  '💎 Puliendo los mejores resultados...',
  '🎯 Aplicando tu filtro mágico...',
  '🎉 ¡Casi listo! Preparando la sorpresa...'
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

const FUNNY_MESSAGES = [
  '🍕 Mientras tanto, ¿ya pensaste en el domicilio?',
  '☕ Perfecto momento para un café...',
  '🎵 *Música de ascensor intensifies*',
  '🦄 Buscando unicornios inmobiliarios...',
  '🎪 El circo de los arriendos está en función...',
  '🔮 Consultando la bola de cristal inmobiliaria...',
  '🎲 Tirando los dados del destino...',
  '🚁 Sobrevolando Bogotá en busca de tesoros...',
  '🕸️ Tejiendo la red de propiedades perfectas...',
  '⚡ Cargando poderes inmobiliarios...',
  '🎭 El teatro de los arriendos presenta...',
  '🌟 Haciendo magia inmobiliaria...',
  '🎪 ¡Señoras y señores, el show debe continuar!',
  '🚀 Houston, tenemos propiedades...',
  '🎯 Apuntando al blanco perfecto...'
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

        // Cambiar fase basado en progreso con mensajes divertidos aleatorios
        let phaseIndex = Math.floor((newProgress / 100) * SEARCH_PHASES.length);
        phaseIndex = Math.min(phaseIndex, SEARCH_PHASES.length - 1);

        // Cada 10 segundos, mostrar un mensaje divertido aleatorio
        let currentPhase = SEARCH_PHASES[phaseIndex];
        if (elapsed % 10 === 0 && elapsed > 0) {
          const randomMessage = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
          currentPhase = randomMessage;
        }

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
          currentPhase,
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
