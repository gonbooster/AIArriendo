import { useState, useEffect, useCallback } from 'react';
import { searchAPI } from '../services/api';

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
  sources: string[]; // Fuentes dinámicas desde backend
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
  'Arriendo',
  'Ciencuadras',
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
  '🚁 Sobrevolando el planeta en busca de tesoros...',
  '🕸️ Tejiendo la red de propiedades perfectas...',
  '⚡ Cargando poderes inmobiliarios...',
  '🎭 El teatro de los arriendos presenta...',
  '🌟 Haciendo magia inmobiliaria...',
  '🎪 ¡Señoras y señores, el show debe continuar!',
  '🚀 Houston, tenemos propiedades...',
  '🎯 Apuntando al blanco perfecto...'
];

const COMPLETION_MESSAGES = [
  '🎯 ¡Casi listo! Puliendo los resultados como diamantes... ¡Brillarán para ti!',
  '✨ ¡Perfecto! Organizando las mejores opciones para tu nuevo hogar...',
  '🏆 ¡Misión cumplida! Hemos encontrado tesoros inmobiliarios para ti...',
  '🎉 ¡Eureka! Las mejores propiedades están listas para conquistar...',
  '💎 ¡Excelente! Seleccionando las joyas inmobiliarias más brillantes...',
  '🌟 ¡Fantástico! Preparando una experiencia inmobiliaria estelar...',
  '🎪 ¡Show time! Los mejores arriendos están listos para el gran debut...',
  '🚀 ¡Despegue exitoso! Aterrizando en el planeta de las oportunidades...'
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
    estimatedTimeRemaining: 60,
    sources: SOURCES // Inicializar con fuentes por defecto
  });

  const [startTime, setStartTime] = useState<number>(0);

  // 🚀 Cargar fuentes dinámicamente desde backend
  const loadDynamicSources = useCallback(async () => {
    try {
      const response = await fetch('/api/search/sources');
      const data = await response.json();
      if (data.success && data.data) {
        const sourceNames = data.data
          .filter((source: any) => source.isActive)
          .sort((a: any, b: any) => a.priority - b.priority)
          .map((source: any) => source.name);

        setState(prev => ({
          ...prev,
          sources: sourceNames,
          totalSources: sourceNames.length
        }));

        return sourceNames;
      }
    } catch (error) {
      console.warn('Failed to load dynamic sources, using fallback:', error);
    }
    return SOURCES; // Fallback a fuentes estáticas
  }, []);

  const startSearch = useCallback(async () => {
    const now = Date.now();
    setStartTime(now);

    // 🚀 Cargar fuentes dinámicas al iniciar búsqueda
    const dynamicSources = await loadDynamicSources();

    setState(prev => ({
      ...prev,
      isSearching: true,
      progress: 0,
      currentPhase: SEARCH_PHASES[0],
      currentSource: '',
      sourcesCompleted: 0,
      propertiesFound: 0,
      timeElapsed: 0,
      estimatedTimeRemaining: 60,
      sources: dynamicSources,
      totalSources: dynamicSources.length
    }));
  }, [loadDynamicSources]);

  const updateProgress = useCallback((updates: Partial<SearchProgressState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const completeSearch = useCallback(() => {
    const randomCompletionMessage = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
    setState(prev => ({
      ...prev,
      isSearching: false,
      progress: 100,
      currentPhase: randomCompletionMessage,
      estimatedTimeRemaining: 0,
      sourcesCompleted: prev.sources.length // Usar fuentes dinámicas
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

        // Cambiar fuente basado en progreso (usar fuentes dinámicas)
        const currentSources = prev.sources;
        const sourceIndex = Math.floor((newProgress / 100) * currentSources.length);
        const currentSource = sourceIndex < currentSources.length ? currentSources[sourceIndex] : '';

        // Calcular fuentes completadas
        const sourcesCompleted = Math.floor((newProgress / 100) * currentSources.length);

        // 🚀 DINÁMICO: Calcular propiedades basado en progreso real
        // Usar una función más realista que simule el crecimiento de propiedades
        const baseProperties = 50; // Propiedades iniciales
        const maxProperties = 1500; // Máximo realista
        const propertiesFound = Math.floor(baseProperties + (newProgress / 100) * (maxProperties - baseProperties));

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
    SOURCES: state.sources // Usar fuentes dinámicas en lugar de estáticas
  };
};
