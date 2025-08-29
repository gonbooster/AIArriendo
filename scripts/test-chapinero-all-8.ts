/**
 * Test final con Chapinero para los 8 proveedores
 */

async function testChapineroAll8() {
  console.log('🔍 TESTING CHAPINERO FOR ALL 8 PROVIDERS (FIXED)\n');
  
  const chapineroCriteria = {
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
    },
    page: 1,
    limit: 48
  };

  console.log('📋 Criterios Chapinero:');
  console.log(JSON.stringify(chapineroCriteria, null, 2));
  
  try {
    console.log('\n🔄 Ejecutando búsqueda...');
    const response = await fetch('http://localhost:3001/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chapineroCriteria)
    });

    if (!response.ok) {
      console.log(`❌ Error HTTP: ${response.status}`);
      return;
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      const { properties, summary } = data.data;
      
      console.log('\n✅ RESULTADOS CHAPINERO:');
      console.log(`📊 Total propiedades: ${properties.length}`);
      console.log(`📈 Breakdown por fuente:`, summary.sourceBreakdown || summary.sources);
      
      const sources = summary.sourceBreakdown || summary.sources || {};
      const activeProviders = Object.keys(sources).filter(source => sources[source] > 0);
      const allProviders = ['Fincaraiz', 'Ciencuadras', 'MercadoLibre', 'Metrocuadrado', 'Trovit', 'Properati', 'PADS', 'Rentola'];
      const missingProviders = allProviders.filter(p => !activeProviders.includes(p));
      
      console.log(`\n🎯 Proveedores activos: ${activeProviders.length}/8`);
      console.log(`✅ Fuentes funcionando: ${activeProviders.join(', ')}`);
      
      if (missingProviders.length > 0) {
        console.log(`❌ Proveedores faltantes: ${missingProviders.join(', ')}`);
      }
      
      if (activeProviders.length >= 6) {
        console.log(`\n🎉 ¡ÉXITO! Chapinero obtiene ${activeProviders.length} proveedores`);
        console.log(`\n📄 PARÁMETROS GANADORES PARA ${activeProviders.length} PROVEEDORES:`);
        console.log(JSON.stringify(chapineroCriteria, null, 2));
      } else if (activeProviders.length >= 4) {
        console.log(`\n✅ BUENO! Chapinero obtiene ${activeProviders.length} proveedores`);
      } else {
        console.log(`\n⚠️ REGULAR! Solo ${activeProviders.length} proveedores funcionando`);
      }
      
      // Mostrar ejemplos de propiedades por fuente
      console.log('\n📄 EJEMPLOS POR FUENTE:');
      activeProviders.forEach(source => {
        const sourceProps = properties.filter(p => p.source === source);
        if (sourceProps.length > 0) {
          const example = sourceProps[0];
          console.log(`${source}: ${example.title.substring(0, 50)}... - $${example.price.toLocaleString()}`);
        }
      });
      
    } else {
      console.log(`❌ Error en respuesta:`, data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.log(`❌ Error en request:`, error);
  }
}

// Ejecutar test
testChapineroAll8().catch(console.error);
