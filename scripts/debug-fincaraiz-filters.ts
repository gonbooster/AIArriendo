import { FincaraizScraper } from '../core/scraping/scrapers/FincaraizScraper';
import { SearchCriteria, ScrapingSource, RateLimit } from '../core/types';
import { RateLimiter } from '../core/scraping/RateLimiter';

async function debugFincaraizFilters() {
  console.log('🔍 DEBUGGING FINCARAIZ FILTERS\n');
  console.log('=' .repeat(60));

  // Crear source y rate limiter para el scraper
  const source: ScrapingSource = {
    id: 'fincaraiz',
    name: 'Fincaraiz',
    baseUrl: 'https://www.fincaraiz.com.co',
    isActive: true,
    priority: 1,
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      maxConcurrentRequests: 2
    },
    selectors: {
      propertyCard: '.property-card',
      title: '.title',
      price: '.price',
      area: '.area',
      rooms: '.rooms',
      location: '.location',
      link: '.link'
    }
  };

  const rateLimiter = new RateLimiter(source.rateLimit);
  const scraper = new FincaraizScraper(source, rateLimiter);

  // Criterios básicos para obtener propiedades
  const basicCriteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 1,
      minArea: 30,
      maxTotalPrice: 10000000,
      allowAdminOverage: false,
      operation: 'arriendo',
      propertyTypes: ['Apartamento'],
      location: {
        city: 'Bogotá'
      }
    },
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: [],
      weights: {
        wetAreas: 1,
        sports: 1,
        amenities: 1,
        location: 1,
        pricePerM2: 1
      }
    }
  };

  try {
    console.log('🚀 Ejecutando scraping básico de Fincaraiz...\n');
    const properties = await scraper.scrape(basicCriteria);
    
    console.log(`📊 PROPIEDADES ENCONTRADAS: ${properties.length}\n`);

    if (properties.length === 0) {
      console.log('❌ No se encontraron propiedades en Fincaraiz');
      console.log('💡 Esto indica un problema en el scraper base');
      return;
    }

    // Analizar cada propiedad en detalle
    properties.forEach((property, index) => {
      console.log(`🏠 PROPIEDAD ${index + 1}:`);
      console.log(`   📝 ID: ${property.id}`);
      console.log(`   📝 Título: ${property.title}`);
      console.log(`   💰 Precio: $${property.price?.toLocaleString() || 'N/A'}`);
      console.log(`   💰 Precio Total: $${property.totalPrice?.toLocaleString() || 'N/A'}`);
      console.log(`   💰 Admin: $${property.adminFee?.toLocaleString() || 'N/A'}`);
      console.log(`   📐 Área: ${property.area || 'N/A'} m²`);
      console.log(`   🛏️  Habitaciones: ${property.rooms || 'N/A'}`);
      console.log(`   🚿 Baños: ${property.bathrooms || 'N/A'}`);
      console.log(`   🚗 Parqueaderos: ${property.parking || 'N/A'}`);
      console.log(`   🏢 Estrato: ${property.stratum || 'N/A'}`);
      console.log(`   📍 Dirección: ${property.location.address || 'N/A'}`);
      console.log(`   📍 Barrio: ${property.location.neighborhood || 'N/A'}`);
      console.log(`   📍 Ciudad: ${property.location.city || 'N/A'}`);
      console.log(`   🖼️  Imágenes: ${property.images?.length || 0}`);
      if (property.images && property.images.length > 0) {
        property.images.slice(0, 2).forEach((img, imgIndex) => {
          console.log(`      ${imgIndex + 1}. ${img.substring(0, 80)}...`);
        });
      }
      console.log(`   🔗 URL: ${property.url}`);
      console.log(`   📄 Descripción: ${property.description?.substring(0, 100) || 'N/A'}...`);
      
      // ANÁLISIS DE FILTROS
      console.log(`\n   🔍 ANÁLISIS DE FILTROS:`);
      
      // Filtro de habitaciones (2-3)
      const roomsOK = property.rooms >= 2 && property.rooms <= 3;
      console.log(`      🛏️  Habitaciones (2-3): ${roomsOK ? '✅' : '❌'} (${property.rooms})`);
      
      // Filtro de baños (1-2)
      const bathroomsOK = (property.bathrooms || 0) >= 1 && (property.bathrooms || 0) <= 2;
      console.log(`      🚿 Baños (1-2): ${bathroomsOK ? '✅' : '❌'} (${property.bathrooms || 0})`);
      
      // Filtro de área (60-100)
      const areaOK = property.area >= 60 && property.area <= 100;
      console.log(`      📐 Área (60-100m²): ${areaOK ? '✅' : '❌'} (${property.area}m²)`);
      
      // Filtro de precio (1.5M-4M)
      const priceOK = property.totalPrice >= 1500000 && property.totalPrice <= 4000000;
      console.log(`      💰 Precio (1.5M-4M): ${priceOK ? '✅' : '❌'} ($${property.totalPrice?.toLocaleString()})`);
      
      // Filtro de estrato (3-5 o no detectado)
      const stratum = property.stratum || 0;
      const stratumOK = stratum === 0 || (stratum >= 3 && stratum <= 5);
      console.log(`      🏢 Estrato (3-5 o N/A): ${stratumOK ? '✅' : '❌'} (${stratum})`);
      
      // Filtro de tipo (Apartamento)
      const title = property.title.toLowerCase();
      const typeOK = title.includes('apartamento') || title.includes('apto');
      console.log(`      🏠 Tipo (Apartamento): ${typeOK ? '✅' : '❌'} (${title.includes('apartamento') ? 'apartamento' : title.includes('apto') ? 'apto' : 'otro'})`);
      
      // Filtro de barrios (Suba, Usaquén, Chapinero)
      const neighborhood = (property.location.neighborhood || '').toLowerCase();
      const address = (property.location.address || '').toLowerCase();
      const targetNeighborhoods = ['suba', 'usaquén', 'usaquen', 'chapinero', 'chico', 'nogal'];
      const neighborhoodOK = targetNeighborhoods.some(target => 
        neighborhood.includes(target) || address.includes(target)
      );
      console.log(`      📍 Barrios (Suba/Usaquén/Chapinero): ${neighborhoodOK ? '✅' : '❌'} (${neighborhood || address || 'N/A'})`);
      
      // Resumen
      const allFiltersOK = roomsOK && bathroomsOK && areaOK && priceOK && stratumOK && typeOK && neighborhoodOK;
      console.log(`\n   🎯 PASA TODOS LOS FILTROS: ${allFiltersOK ? '✅ SÍ' : '❌ NO'}`);
      
      if (!allFiltersOK) {
        const failedFilters = [];
        if (!roomsOK) failedFilters.push('Habitaciones');
        if (!bathroomsOK) failedFilters.push('Baños');
        if (!areaOK) failedFilters.push('Área');
        if (!priceOK) failedFilters.push('Precio');
        if (!stratumOK) failedFilters.push('Estrato');
        if (!typeOK) failedFilters.push('Tipo');
        if (!neighborhoodOK) failedFilters.push('Barrios');
        
        console.log(`   ❌ Filtros que fallan: ${failedFilters.join(', ')}`);
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
    });

    // Resumen final
    const validProperties = properties.filter(p => {
      const roomsOK = p.rooms >= 2 && p.rooms <= 3;
      const bathroomsOK = (p.bathrooms || 0) >= 1 && (p.bathrooms || 0) <= 2;
      const areaOK = p.area >= 60 && p.area <= 100;
      const priceOK = p.totalPrice >= 1500000 && p.totalPrice <= 4000000;
      const stratum = p.stratum || 0;
      const stratumOK = stratum === 0 || (stratum >= 3 && stratum <= 5);
      const title = p.title.toLowerCase();
      const typeOK = title.includes('apartamento') || title.includes('apto');
      const neighborhood = (p.location.neighborhood || '').toLowerCase();
      const address = (p.location.address || '').toLowerCase();
      const targetNeighborhoods = ['suba', 'usaquén', 'usaquen', 'chapinero', 'chico', 'nogal'];
      const neighborhoodOK = targetNeighborhoods.some(target => 
        neighborhood.includes(target) || address.includes(target)
      );
      
      return roomsOK && bathroomsOK && areaOK && priceOK && stratumOK && typeOK && neighborhoodOK;
    });

    console.log('📈 RESUMEN FINAL:');
    console.log(`   Total propiedades scraped: ${properties.length}`);
    console.log(`   Propiedades que pasan filtros: ${validProperties.length}`);
    console.log(`   Tasa de éxito: ${((validProperties.length / properties.length) * 100).toFixed(1)}%`);

    if (validProperties.length > 0) {
      console.log('\n✅ PROPIEDADES VÁLIDAS:');
      validProperties.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.title.substring(0, 50)}... - $${p.totalPrice.toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error durante el debug:', error);
  }
}

// Ejecutar debug
debugFincaraizFilters().catch(console.error);
