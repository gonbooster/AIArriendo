/**
 * Componente de autocompletado inteligente para ubicaciones
 * - Búsqueda en tiempo real
 * - Fuzzy search con tolerancia a errores
 * - Cache para performance
 * - UI/UX optimizada
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { locationService, Location } from '../services/locationService';
import './LocationAutocomplete.css';

interface LocationAutocompleteProps {
  value?: Location | null;
  onChange: (location: Location | null) => void;
  placeholder?: string;
  label?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  required?: boolean;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value = null,
  onChange,
  placeholder = 'Buscar ciudad, barrio o zona...',
  label,
  className = '',
  disabled = false,
  autoFocus = false,
  required = false
}) => {
  const [inputValue, setInputValue] = useState(value?.name || '');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isInitialized, setIsInitialized] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar servicio
  useEffect(() => {
    const initService = async () => {
      setIsLoading(true);
      try {
        await locationService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing location service:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initService();
  }, []);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current && isInitialized) {
      inputRef.current.focus();
    }
  }, [autoFocus, isInitialized]);

  // Búsqueda con debounce
  const searchLocations = useCallback(async (query: string) => {
    if (!isInitialized) return;

    setIsLoading(true);
    try {
      const results = await locationService.search(query, 8);
      setSuggestions(results);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    // Si el usuario está escribiendo, crear una ubicación temporal
    if (newValue.trim()) {
      const tempLocation: Location = {
        id: `custom_${newValue.toLowerCase().replace(/\s+/g, '_')}`,
        name: newValue.trim(),
        type: 'neighborhood',
        city: 'Bogotá',
        department: 'Bogotá D.C.'
      };
      onChange(tempLocation);
    } else {
      onChange(null);
    }

    // Limpiar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Buscar con debounce
    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  // Manejar selección
  const handleSelect = (location: Location) => {
    setInputValue(location.name);
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onChange(location);

    // Enfocar el input después de la selección
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Manejar teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          // Si no hay selección pero hay texto, crear ubicación personalizada
          const customLocation: Location = {
            id: `custom_${inputValue.toLowerCase().replace(/\s+/g, '_')}`,
            name: inputValue.trim(),
            type: 'neighborhood',
            city: 'Bogotá',
            department: 'Bogotá D.C.'
          };
          handleSelect(customLocation);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Manejar focus
  const handleFocus = () => {
    if (isInitialized && inputValue.length >= 2) {
      setIsOpen(true);
      searchLocations(inputValue);
    }
  };

  // Manejar blur
  const handleBlur = () => {
    // Delay para permitir clicks en sugerencias
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 150);
  };

  // Scroll automático para elemento seleccionado
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Renderizar icono de tipo de ubicación
  const renderLocationIcon = (type: Location['type']) => {
    switch (type) {
      case 'country':
        return '🇨🇴';
      case 'department':
        return '🏛️';
      case 'city':
        return '🏙️';
      case 'neighborhood':
        return '🏘️';
      case 'zone':
        return '📍';
      default:
        return '📍';
    }
  };

  // Renderizar descripción de ubicación
  const renderLocationDescription = (location: Location) => {
    const parts = [];
    
    if (location.city && location.city !== location.name) {
      parts.push(location.city);
    }
    
    if (location.department && location.department !== location.city) {
      parts.push(location.department);
    }
    
    return parts.length > 0 ? parts.join(', ') : '';
  };

  return (
    <div className={`location-autocomplete ${className}`}>
      <div className="location-autocomplete__input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || !isInitialized}
          className={`location-autocomplete__input ${isLoading ? 'loading' : ''}`}
          autoComplete="off"
          spellCheck={false}
        />
        
        {isLoading && (
          <div className="location-autocomplete__spinner">
            <div className="spinner"></div>
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul ref={listRef} className="location-autocomplete__suggestions">
          {suggestions.map((location, index) => (
            <li
              key={location.id}
              className={`location-autocomplete__suggestion ${
                index === selectedIndex ? 'selected' : ''
              }`}
              onClick={() => handleSelect(location)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="location-autocomplete__suggestion-content">
                <span className="location-autocomplete__icon">
                  {renderLocationIcon(location.type)}
                </span>
                
                <div className="location-autocomplete__text">
                  <div className="location-autocomplete__name">
                    {location.name}
                  </div>
                  
                  {renderLocationDescription(location) && (
                    <div className="location-autocomplete__description">
                      {renderLocationDescription(location)}
                    </div>
                  )}
                </div>
                
                <span className="location-autocomplete__type">
                  {location.type === 'neighborhood' ? 'Barrio' :
                   location.type === 'city' ? 'Ciudad' :
                   location.type === 'zone' ? 'Zona' :
                   location.type === 'department' ? 'Departamento' : 'País'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !isLoading && suggestions.length === 0 && inputValue.length >= 2 && (
        <div className="location-autocomplete__no-results">
          <div className="location-autocomplete__no-results-content">
            <span>🔍</span>
            <span>No se encontraron ubicaciones para "{inputValue}"</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
