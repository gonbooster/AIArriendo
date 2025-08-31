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
    const randomCompletionMessage = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
    setState(prev => ({
      ...prev,
      isSearching: false,
      progress: 100,
      currentPhase: randomCompletionMessage,
      estimatedTimeRemaining: 0,
      sourcesCompleted: SOURCES.length // Asegurar que todas las fuentes aparezcan como completadas
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
    SOURCES
  };
};
