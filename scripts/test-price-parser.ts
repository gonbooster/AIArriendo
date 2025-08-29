// Test específico para el parser de precios de Fincaraiz

function testPriceParser() {
  console.log('🔍 TESTING PRICE PARSER\n');

  // Casos de prueba reales de Fincaraiz
  const testCases = [
    '$ 1.600.000Apartaestudio en La candelaria, Medellín, Antioquia1 Hab 1 Baño45 m²',
    '$ 5.120.000+ $ 680.000 adminApartamento en Chico norte, Bogotá, Bogotá, d.c.1 Hab 1 Baño60 m²',
    'Apartamento en Arriendo',
    '$ 15.500.000+ $ 2.749.000 adminApartamento en El nogal, Bogotá, Bogotá, d.c.3 Habs. 5 Baños257 m²',
    '$ 3.700.000Casa en Gratamira, Bogotá, Bogotá, d.c.1 Hab 110 m²'
  ];

  // Función de parsing mejorada
  function parsePrice(priceText: string): number {
    if (!priceText) return 1500000; // Default price

    console.log(`🔍 Parsing: "${priceText.substring(0, 100)}..."`);

    // Buscar patrones específicos de precios
    const pricePatterns = [
      // Patrón principal: $ 15.500.000
      /\$\s*([\d]{1,3}(?:\.[\d]{3})*(?:\.[\d]{3})*)/g,
      // Patrón alternativo: $15500000
      /\$\s*([\d]{7,10})/g,
      // Patrón con comas: $15,500,000
      /\$\s*([\d]{1,3}(?:,[\d]{3})*)/g,
      // Números grandes sin símbolo
      /([\d]{7,10})/g
    ];

    let bestPrice = 0;
    
    for (const pattern of pricePatterns) {
      const matches = priceText.match(pattern);
      if (matches) {
        console.log(`   📋 Pattern ${pattern} found matches:`, matches);
        for (const match of matches) {
          // Extraer solo los números
          const cleanNumber = match.replace(/[^\d]/g, '');
          console.log(`      🔢 Clean number: "${cleanNumber}" (length: ${cleanNumber.length})`);
          
          if (cleanNumber.length >= 6 && cleanNumber.length <= 10) {
            const price = parseInt(cleanNumber, 10);
            console.log(`      💰 Parsed price: $${price.toLocaleString()}`);
            
            // Validar que sea un precio razonable para Colombia (500K - 50M)
            if (price >= 500000 && price <= 50000000) {
              if (price > bestPrice) {
                bestPrice = price;
                console.log(`      ✅ New best price: $${price.toLocaleString()}`);
              }
            } else {
              console.log(`      ❌ Price out of range: $${price.toLocaleString()}`);
            }
          } else {
            console.log(`      ❌ Number length invalid: ${cleanNumber.length}`);
          }
        }
      } else {
        console.log(`   ❌ Pattern ${pattern} found no matches`);
      }
    }

    if (bestPrice > 0) {
      console.log(`   ✅ Final result: $${bestPrice.toLocaleString()}\n`);
      return bestPrice;
    }

    // Último intento: buscar cualquier secuencia de 7+ dígitos
    const digitSequences = priceText.match(/\d{7,}/g);
    if (digitSequences) {
      console.log(`   🔍 Trying digit sequences:`, digitSequences);
      for (const sequence of digitSequences) {
        const price = parseInt(sequence, 10);
        if (price >= 500000 && price <= 50000000) {
          console.log(`   ⚠️  Using digit sequence: $${price.toLocaleString()}\n`);
          return price;
        }
      }
    }

    console.log(`   ❌ Could not parse price, using default\n`);
    return 1500000;
  }

  // Probar cada caso
  testCases.forEach((testCase, index) => {
    console.log(`🧪 TEST CASE ${index + 1}:`);
    const result = parsePrice(testCase);
    console.log(`📊 RESULT: $${result.toLocaleString()}`);
    console.log('-'.repeat(80));
  });

  // Casos específicos problemáticos
  console.log('\n🎯 CASOS ESPECÍFICOS PROBLEMÁTICOS:\n');
  
  const problematicCases = [
    '$ 15.500.000+ $ 2.749.000 admin',
    '$ 5.120.000+ $ 680.000 admin',
    '$15.500.000',
    '15.500.000',
    '15500000'
  ];

  problematicCases.forEach((testCase, index) => {
    console.log(`🔥 PROBLEMATIC CASE ${index + 1}: "${testCase}"`);
    const result = parsePrice(testCase);
    console.log(`📊 RESULT: $${result.toLocaleString()}`);
    console.log('-'.repeat(50));
  });
}

// Ejecutar test
testPriceParser();
