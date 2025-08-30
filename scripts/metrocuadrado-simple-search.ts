#!/usr/bin/env ts-node

/**
 * Script de búsqueda específico para Metrocuadrado
 * Basado en el HTML del archivo text.txt
 * Solo requiere ubicación y automáticamente busca arriendos
 */

import puppeteer from 'puppeteer';
import { logger } from '../utils/logger';

interface MetrocuadradoSearchParams {
  location: string;
  propertyType?: string; // apartamento, casa, etc.
}

class MetrocuadradoSimpleSearch {
  
  /**
   * Ejecuta búsqueda directa en Metrocuadrado
   */
  async searchRentals(params: MetrocuadradoSearchParams): Promise<void> {
    console.log('🏠 BÚSQUEDA SIMPLE EN METROCUADRADO');
    console.log('=' .repeat(50));
    console.log(`📍 Ubicación: ${params.location}`);
    console.log(`🏠 Tipo: ${params.propertyType || 'Apartamento'}`);
    console.log('💼 Operación: Arriendo (fijo)');
    console.log('');

    const browser = await puppeteer.launch({ 
      headless: false, // Mostrar navegador para ver el proceso
      defaultViewport: { width: 1200, height: 800 }
    });

    try {
      const page = await browser.newPage();
      
      // Ir a la página principal de Metrocuadrado
      console.log('🌐 Navegando a Metrocuadrado...');
      await page.goto('https://www.metrocuadrado.com/', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Esperar a que carguen los elementos del formulario
      console.log('⏳ Esperando formulario de búsqueda...');
      await page.waitForSelector('pt-dropdown[element-id="locationType"]', { timeout: 15000 });

      // Configurar tipo de negocio a "arriendo"
      console.log('🔧 Configurando tipo de operación: Arriendo...');
      await this.setBusinessType(page, 'arriendo');

      // Configurar ubicación
      console.log(`📍 Configurando ubicación: ${params.location}...`);
      await this.setLocation(page, params.location);

      // Configurar tipo de propiedad si se especifica
      if (params.propertyType) {
        console.log(`🏠 Configurando tipo de propiedad: ${params.propertyType}...`);
        await this.setPropertyType(page, params.propertyType);
      }

      // Hacer clic en buscar
      console.log('🔍 Ejecutando búsqueda...');
      await this.clickSearch(page);

      // Esperar resultados
      console.log('⏳ Esperando resultados...');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

      // Extraer y mostrar resultados
      await this.extractAndDisplayResults(page);

    } catch (error) {
      console.error('❌ Error en la búsqueda:', error);
      logger.error('Metrocuadrado simple search failed:', error);
    } finally {
      console.log('🔒 Cerrando navegador...');
      await browser.close();
    }
  }

  /**
   * Configura el tipo de negocio (arriendo/venta)
   */
  private async setBusinessType(page: any, type: string): Promise<void> {
    try {
      // Buscar el dropdown de tipo de negocio
      const businessDropdown = await page.$('pt-dropdown[element-id="typeBusiness"]');
      if (businessDropdown) {
        await businessDropdown.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Buscar opción de arriendo
        const arrendOption = await page.$x(`//text()[contains(., 'arriendo') or contains(., 'Arriendo')]`);
        if (arrendOption.length > 0) {
          await arrendOption[0].click();
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo configurar tipo de negocio automáticamente');
    }
  }

  /**
   * Configura la ubicación
   */
  private async setLocation(page: any, location: string): Promise<void> {
    try {
      // Buscar el campo de ubicación
      const locationInput = await page.$('pt-dropdown[element-id="locationType"] input');
      if (locationInput) {
        await locationInput.click();
        await locationInput.type(location);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar sugerencias
        
        // Presionar Enter o seleccionar primera opción
        await page.keyboard.press('Enter');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo configurar ubicación automáticamente');
    }
  }

  /**
   * Configura el tipo de propiedad
   */
  private async setPropertyType(page: any, propertyType: string): Promise<void> {
    try {
      const propertyDropdown = await page.$('pt-dropdown-chip[element-id="typeProperty"]');
      if (propertyDropdown) {
        await propertyDropdown.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Buscar la opción del tipo de propiedad
        const propertyOption = await page.$x(`//text()[contains(., '${propertyType}')]`);
        if (propertyOption.length > 0) {
          await propertyOption[0].click();
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo configurar tipo de propiedad automáticamente');
    }
  }

  /**
   * Hace clic en el botón de búsqueda
   */
  private async clickSearch(page: any): Promise<void> {
    try {
      const searchButton = await page.$('pt-button[element-id="ptButtonSearch"]');
      if (searchButton) {
        await searchButton.click();
      } else {
        // Buscar botón alternativo
        const altButton = await page.$('button[aria-label="search"]');
        if (altButton) {
          await altButton.click();
        }
      }
    } catch (error) {
      console.error('❌ No se pudo hacer clic en buscar');
      throw error;
    }
  }

  /**
   * Extrae y muestra los resultados
   */
  private async extractAndDisplayResults(page: any): Promise<void> {
    try {
      // Esperar a que carguen los resultados
      await page.waitForSelector('.property-card, .listing-item, [data-testid*="property"]', { 
        timeout: 15000 
      }).catch(() => {
        console.log('⏳ Esperando más tiempo para resultados...');
      });

      // Extraer información básica de la página
      const pageInfo = await page.evaluate(() => {
        const title = document.title;
        const url = window.location.href;
        const resultCount = document.querySelectorAll('.property-card, .listing-item, [data-testid*="property"]').length;
        
        return { title, url, resultCount };
      });

      console.log('📊 INFORMACIÓN DE RESULTADOS');
      console.log('=' .repeat(50));
      console.log(`📄 Título de página: ${pageInfo.title}`);
      console.log(`🔗 URL actual: ${pageInfo.url}`);
      console.log(`🏠 Propiedades encontradas: ${pageInfo.resultCount}`);
      console.log('');

      if (pageInfo.resultCount > 0) {
        console.log('✅ ¡Búsqueda exitosa! Se encontraron propiedades.');
        console.log('💡 Puedes ver los resultados en el navegador que se abrió.');
        console.log('📱 La página permanecerá abierta por 30 segundos para que puedas revisar.');
        
        // Mantener la página abierta por un momento
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        console.log('❌ No se encontraron propiedades con los criterios especificados.');
        console.log('💡 Sugerencias:');
        console.log('   - Verifica que la ubicación esté bien escrita');
        console.log('   - Intenta con una ubicación más general (ej: "Bogotá" en lugar de barrio específico)');
        console.log('   - Revisa la página manualmente en el navegador');
      }

    } catch (error) {
      console.error('❌ Error extrayendo resultados:', error);
      console.log('📱 Revisa manualmente la página en el navegador que se abrió.');
      await new Promise(resolve => setTimeout(resolve, 15000)); // Dar tiempo para revisión manual
    }
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Error: Debes especificar una ubicación');
    console.log('');
    console.log('📖 USO:');
    console.log('   npm run metro-search "Chapinero"');
    console.log('   npm run metro-search "Usaquén"');
    console.log('   npm run metro-search "Zona Rosa"');
    console.log('   npm run metro-search "Bogotá"');
    console.log('');
    console.log('💡 También puedes especificar tipo de propiedad:');
    console.log('   npm run metro-search "Chapinero" "apartamento"');
    console.log('   npm run metro-search "Usaquén" "casa"');
    process.exit(1);
  }

  const location = args[0];
  const propertyType = args[1];

  const searcher = new MetrocuadradoSimpleSearch();
  
  await searcher.searchRentals({
    location,
    propertyType
  });
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export { MetrocuadradoSimpleSearch };
