/**
 * Probar ubicaciones específicas que devuelvan resultados para todos los proveedores
 */

async function testSpecificLocations() {
  console.log('🔍 TESTING SPECIFIC LOCATIONS FOR ALL PROVIDERS\n');
  
  const locations = [
    {
      name: 'Chapinero',
      criteria: {
        operation: "arriendo",
        propertyTypes: ["Apartamento"],
        minRooms: 1,
        maxRooms: 6,
        minBathrooms: 1,
        maxBathrooms: 4,
        minParking: 0,
        maxParking: 3,
        minArea: 30,
        maxArea: 300,
        minPrice: 500000,
        maxPrice: 8000000,
        allowAdminOverage: true,
        minStratum: 2,
        maxStratum: 6,
        location: {
          neighborhoods: ["Chapinero"]
        },
        preferences: {
          wetAreas: [],
          sports: [],
          amenities: []
        }
      }
    },
    {
      name: 'Zona Rosa',
      criteria: {
        operation: "arriendo",
        propertyTypes: ["Apartamento"],
        minRooms: 1,
        maxRooms: 6,
        minBathrooms: 1,
        maxBathrooms: 4,
        minParking: 0,
        maxParking: 3,
        minArea: 30,
        maxArea: 300,
        minPrice: 500000,
        maxPrice: 8000000,
        allowAdminOverage: true,
        minStratum: 2,
        maxStratum: 6,
        location: {
          neighborhoods: ["Zona Rosa"]
        },
        preferences: {
          wetAreas: [],
          sports: [],
          amenities: []
        }
      }
    },
    {
      name: 'Chicó',
      criteria: {
        operation: "arriendo",
        propertyTypes: ["Apartamento"],
        minRooms: 1,
        maxRooms: 6,
        minBathrooms: 1,
        maxBathrooms: 4,
        minParking: 0,
        maxParking: 3,
        minArea: 30,
        maxArea: 300,
        minPrice: 500000,
        maxPrice: 8000000,
        allowAdminOverage: true,
        minStratum: 2,
        maxStratum: 6,
        location: {
          neighborhoods: ["Chicó"]
        },
        preferences: {
          wetAreas: [],
          sports: [],
          amenities: []
        }
      }
    },
    {
      name: 'El Poblado (Medellín)',
      criteria: {
        operation: "arriendo",
        propertyTypes: ["Apartamento"],
        minRooms: 1,
        maxRooms: 6,
        minBathrooms: 1,
        maxBathrooms: 4,
        minParking: 0,
        maxParking: 3,
        minArea: 30,
        maxArea: 300,
        minPrice: 500000,
        maxPrice: 8000000,
        allowAdminOverage: true,
        minStratum: 2,
        maxStratum: 6,
        location: {
          neighborhoods: ["El Poblado"]
        },
        preferences: {
          wetAreas: [],
          sports: [],
          amenities: []
        }
      }
    }
  ];

  for (const location of locations) {
    console.log(`\n🧪 TESTING LOCATION: ${location.name}`);
    
    try {
      const response = await fetch('http://localhost:3001/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          criteria: location.criteria,
          page: 1,
          limit: 48
        })
      });

      if (!response.ok) {
        console.log(`❌ Error HTTP: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const { properties, summary } = data.data;
        
        console.log(`✅ RESULTADOS ${location.name}:`);
        console.log(`📊 Total propiedades: ${properties.length}`);
        console.log(`📈 Breakdown por fuente:`, summary.sourceBreakdown || summary.sources);
        
        const sources = summary.sourceBreakdown || summary.sources || {};
        const activeProviders = Object.keys(sources).filter(source => sources[source] > 0);
        
        console.log(`🎯 Proveedores activos: ${activeProviders.length}/8`);
        console.log(`📋 Fuentes: ${activeProviders.join(', ')}`);
        
        if (activeProviders.length >= 4) {
          console.log(`\n🎉 ¡BUENA UBICACIÓN! ${location.name} obtiene ${activeProviders.length} proveedores`);
        }
        
      } else {
        console.log(`❌ Error en respuesta:`, data.error || 'Unknown error');
      }
      
    } catch (error) {
      console.log(`❌ Error en request:`, error);
    }
    
    // Esperar entre tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Ejecutar test
testSpecificLocations().catch(console.error);
