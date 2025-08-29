import { searchAPI } from '../client/src/services/api';

/**
 * Parámetros optimizados para obtener resultados de los 8 proveedores
 */
const OPTIMAL_CRITERIA = {
  criteria: {
    // Operación y tipo de propiedad más común
    operation: "arriendo",
    propertyTypes: ["Apartamento"],
    
    // Rango de habitaciones amplio para maximizar resultados
    minRooms: 1,
    maxRooms: 6,
    
    // Rango de baños amplio
    minBathrooms: 1,
    maxBathrooms: 4,
    
    // Parqueaderos flexibles (muchas propiedades no tienen)
    minParking: 0,
    maxParking: 3,
    
    // Área muy amplia para incluir desde estudios hasta apartamentos grandes
    minArea: 30,
    maxArea: 300,
    
    // Rango de precios MUY amplio para incluir todas las opciones
    minPrice: 300000,    // $300K - muy bajo para incluir estudios
    maxPrice: 8000000,   // $8M - muy alto para incluir penthouses
    
    // Permitir sobrecosto de administración
    allowAdminOverage: true,
    
    // Estrato completo (1-6)
    minStratum: 1,
    maxStratum: 6,
    
    // Ubicación: Bogotá completo (sin filtro de barrio específico)
    location: {
      neighborhoods: [] // Sin filtro específico = toda Bogotá
    },
    
    // Sin preferencias específicas para maximizar resultados
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: []
    }
  },
  page: 1,
  limit: 48
};

/**
 * Criterios alternativos si los primeros no funcionan
 */
const FALLBACK_CRITERIA = {
  criteria: {
    operation: "arriendo",
    propertyTypes: ["Apartamento"],
    minRooms: 2,
    maxRooms: 4,
    minBathrooms: 1,
    maxBathrooms: 3,
    minParking: 0,
    maxParking: 2,
    minArea: 50,
    maxArea: 150,
    minPrice: 500000,
    maxPrice: 5000000,
    allowAdminOverage: true,
    minStratum: 2,
    maxStratum: 5,
    location: {
      neighborhoods: ["Usaquén"] // Barrio popular con muchas propiedades
    },
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: []
    }
  },
  page: 1,
  limit: 48
};

/**
 * Criterios súper amplios como último recurso
 */
const ULTRA_WIDE_CRITERIA = {
  criteria: {
    operation: "arriendo",
    propertyTypes: ["Apartamento"],
    minRooms: 1,
    maxRooms: 8,
    minBathrooms: 1,
    maxBathrooms: 6,
    minParking: 0,
    maxParking: 5,
    minArea: 20,
    maxArea: 500,
    minPrice: 200000,
    maxPrice: 15000000,
    allowAdminOverage: true,
    minStratum: 1,
    maxStratum: 6,
    location: {
      neighborhoods: []
    },
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: []
    }
  },
  page: 1,
  limit: 48
};

async function testAllProviders() {
  console.log('🔍 TESTING ALL 8 PROVIDERS WITH OPTIMAL CRITERIA\n');
  
  const testCases = [
    { name: 'OPTIMAL', criteria: OPTIMAL_CRITERIA },
    { name: 'FALLBACK', criteria: FALLBACK_CRITERIA },
    { name: 'ULTRA_WIDE', criteria: ULTRA_WIDE_CRITERIA }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 TESTING ${testCase.name} CRITERIA:`);
    console.log(`📋 Criterios:`, JSON.stringify(testCase.criteria.criteria, null, 2));
    
    try {
      const response = await fetch('http://localhost:3001/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.criteria)
      });

      if (!response.ok) {
        console.log(`❌ Error HTTP: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const { properties, summary } = data.data;
        
        console.log(`\n✅ RESULTADOS ${testCase.name}:`);
        console.log(`📊 Total propiedades: ${properties.length}`);
        console.log(`📈 Breakdown por fuente:`, summary.sourceBreakdown || summary.sources);
        
        // Contar proveedores únicos
        const sources = summary.sourceBreakdown || summary.sources || {};
        const activeProviders = Object.keys(sources).filter(source => sources[source] > 0);
        
        console.log(`🎯 Proveedores activos: ${activeProviders.length}/8`);
        console.log(`📋 Fuentes: ${activeProviders.join(', ')}`);
        
        if (activeProviders.length >= 6) {
          console.log(`\n🎉 ¡ÉXITO! ${testCase.name} criteria obtiene resultados de ${activeProviders.length} proveedores`);
          console.log(`\n📄 CRITERIOS GANADORES:`);
          console.log(JSON.stringify(testCase.criteria, null, 2));
          break;
        }
        
      } else {
        console.log(`❌ Error en respuesta:`, data.error || 'Unknown error');
      }
      
    } catch (error) {
      console.log(`❌ Error en request:`, error);
    }
    
    // Esperar entre tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Ejecutar test
testAllProviders().catch(console.error);
