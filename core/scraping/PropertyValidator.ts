import { Property } from '../types';
import { logger } from '../../utils/logger';

/**
 * Validador para propiedades
 */
export class PropertyValidator {
  
  /**
   * Valida si una propiedad es válida
   */
  isValid(property: Property): boolean {
    try {
      // Validaciones básicas
      if (!this.hasRequiredFields(property)) {
        return false;
      }

      if (!this.hasValidPrice(property)) {
        return false;
      }

      if (!this.hasValidArea(property)) {
        return false;
      }

      if (!this.hasValidRooms(property)) {
        return false;
      }

      if (!this.hasValidTitle(property)) {
        return false;
      }

      return true;

    } catch (error) {
      logger.warn('Error validating property:', error);
      return false;
    }
  }

  /**
   * Verifica campos requeridos
   */
  private hasRequiredFields(property: Property): boolean {
    return !!(
      property.id &&
      property.title &&
      property.source &&
      property.location
    );
  }

  /**
   * Valida precio
   */
  private hasValidPrice(property: Property): boolean {
    const price = property.totalPrice || property.price;
    
    if (!price || price <= 0) {
      return false;
    }

    // Rango razonable para Bogotá (300k - 50M)
    if (price < 300000 || price > 50000000) {
      return false;
    }

    return true;
  }

  /**
   * Valida área
   */
  private hasValidArea(property: Property): boolean {
    // Área es opcional. Si no viene o es 0, no invalida la propiedad.
    if (property.area === undefined || property.area === null || property.area === 0) {
      return true;
    }
    // Si viene con valor, debe ser razonable
    if (property.area < 0 || property.area > 1000) {
      return false;
    }
    return true;
  }

  /**
   * Valida habitaciones
   */
  private hasValidRooms(property: Property): boolean {
    // Habitaciones es opcional, pero si existe debe ser válida
    if (property.rooms !== undefined && property.rooms !== null) {
      if (property.rooms < 0 || property.rooms > 20) {
        return false;
      }
    }

    return true;
  }

  /**
   * Valida título
   */
  private hasValidTitle(property: Property): boolean {
    if (!property.title || property.title.trim().length < 5) {
      return false;
    }

    // Verificar que no sea solo números o caracteres especiales
    const cleanTitle = property.title.replace(/[^\w\s]/g, '').trim();
    if (cleanTitle.length < 5) {
      return false;
    }

    return true;
  }

  /**
   * Obtiene errores de validación detallados
   */
  getValidationErrors(property: Property): string[] {
    const errors: string[] = [];

    if (!property.id) errors.push('Missing ID');
    if (!property.title) errors.push('Missing title');
    if (!property.source) errors.push('Missing source');
    if (!property.location) errors.push('Missing location');

    const price = property.totalPrice || property.price;
    if (!price || price <= 0) errors.push('Invalid price');
    if (price && (price < 300000 || price > 50000000)) errors.push('Price out of range');

    if (property.area !== undefined && (property.area <= 0 || property.area > 1000)) {
      errors.push('Invalid area');
    }

    if (property.rooms !== undefined && (property.rooms < 0 || property.rooms > 20)) {
      errors.push('Invalid rooms count');
    }

    if (!this.hasValidTitle(property)) {
      errors.push('Invalid title');
    }

    return errors;
  }
}
