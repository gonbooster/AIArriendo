import puppeteer from 'puppeteer';

async function debugFincaraizImages() {
  console.log('🔍 DEBUGGING FINCARAIZ IMAGES...\n');

  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Configurar user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('📄 Navegando a la página específica de Fincaraiz...');
    await page.goto('https://www.fincaraiz.com.co/apartamento-en-arriendo-en-chico-norte-bogota/192549829', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Esperar a que la página cargue completamente
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🖼️  ANALIZANDO IMÁGENES EN LA PÁGINA...\n');

    const imageData = await page.evaluate(() => {
      const images: any[] = [];
      
      // Buscar todas las imágenes
      const imgElements = document.querySelectorAll('img');
      
      imgElements.forEach((img, index) => {
        const src = img.getAttribute('src');
        const dataSrc = img.getAttribute('data-src');
        const dataLazy = img.getAttribute('data-lazy');
        const dataOriginal = img.getAttribute('data-original');
        const alt = img.getAttribute('alt');
        const className = img.className;
        
        // Solo incluir imágenes que parezcan de propiedades
        if (src && (
          src.includes('infocasas') || 
          src.includes('fincaraiz') || 
          src.includes('cloudfront') ||
          src.includes('amazonaws') ||
          src.includes('cdn')
        )) {
          images.push({
            index,
            src,
            dataSrc,
            dataLazy,
            dataOriginal,
            alt,
            className,
            isPropertyImage: true
          });
        }
      });

      // También buscar en el JSON de la página
      const scripts = document.querySelectorAll('script');
      let jsonData: any = null;
      
      scripts.forEach(script => {
        const content = script.textContent || '';
        if (content.includes('"images"') && content.includes('"img"')) {
          try {
            // Buscar el JSON que contiene las imágenes
            const jsonMatch = content.match(/\{"props":\{.*?\}\}/);
            if (jsonMatch) {
              jsonData = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
      });

      return { images, jsonData };
    });

    console.log(`📊 TOTAL DE IMÁGENES ENCONTRADAS: ${imageData.images.length}\n`);

    // Mostrar todas las imágenes encontradas
    imageData.images.forEach((img, index) => {
      console.log(`🖼️  IMAGEN ${index + 1}:`);
      console.log(`   📎 src: ${img.src}`);
      console.log(`   📎 data-src: ${img.dataSrc || 'N/A'}`);
      console.log(`   📎 alt: ${img.alt || 'N/A'}`);
      console.log(`   📎 className: ${img.className || 'N/A'}`);
      console.log(`   ✅ Es imagen de propiedad: ${img.isPropertyImage}`);
      console.log('');
    });

    // Analizar el JSON de la página
    if (imageData.jsonData) {
      console.log('📋 DATOS JSON ENCONTRADOS:');
      
      try {
        const propertyData = imageData.jsonData.props?.pageProps?.data;
        
        if (propertyData) {
          console.log(`   🏠 Título: ${propertyData.title || 'N/A'}`);
          console.log(`   💰 Precio: ${propertyData.price?.amount || 'N/A'}`);
          console.log(`   📐 Área: ${propertyData.m2 || 'N/A'} m²`);
          console.log(`   🛏️  Habitaciones: ${propertyData.bedrooms || 'N/A'}`);
          console.log(`   🚿 Baños: ${propertyData.bathrooms || 'N/A'}`);
          
          // Imagen principal
          if (propertyData.img) {
            console.log(`   🖼️  Imagen principal: ${propertyData.img}`);
          }
          
          // Array de imágenes
          if (propertyData.images && Array.isArray(propertyData.images)) {
            console.log(`   📷 Total imágenes en JSON: ${propertyData.images.length}`);
            propertyData.images.forEach((imgObj: any, idx: number) => {
              console.log(`      ${idx + 1}. ${imgObj.image || imgObj.src || imgObj}`);
            });
          }
        }
      } catch (e) {
        console.log('   ❌ Error procesando JSON:', e);
      }
    }

    // Buscar la imagen principal específicamente
    console.log('\n🎯 BUSCANDO IMAGEN PRINCIPAL...');
    
    const mainImage = await page.evaluate(() => {
      // Buscar en diferentes ubicaciones posibles
      const selectors = [
        'img[src*="infocasas"]',
        'img[src*="fincaraiz"]',
        '.gallery img',
        '.property-image img',
        '.main-image img',
        '[class*="image"] img',
        'img[alt*="apartamento"]',
        'img[alt*="propiedad"]'
      ];
      
      for (const selector of selectors) {
        const img = document.querySelector(selector) as HTMLImageElement;
        if (img && img.src) {
          return {
            selector,
            src: img.src,
            alt: img.alt,
            found: true
          };
        }
      }
      
      return { found: false };
    });

    if (mainImage.found) {
      console.log(`✅ IMAGEN PRINCIPAL ENCONTRADA:`);
      console.log(`   📎 Selector: ${mainImage.selector}`);
      console.log(`   📎 URL: ${mainImage.src}`);
      console.log(`   📎 Alt: ${mainImage.alt || 'N/A'}`);
    } else {
      console.log(`❌ NO SE ENCONTRÓ IMAGEN PRINCIPAL`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

// Ejecutar el debug
debugFincaraizImages().catch(console.error);
