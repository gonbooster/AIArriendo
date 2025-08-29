import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

async function testFincaraizSpecific() {
  console.log('🔍 TESTING FINCARAIZ SCRAPER WITH SPECIFIC URL...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    const specificUrl = 'https://www.fincaraiz.com.co/apartamento-en-arriendo-en-chico-norte-bogota/192549829';
    console.log(`📄 Navegando a: ${specificUrl}`);

    await page.goto(specificUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Esperar a que se cargue el contenido dinámico
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Buscar directamente en la página usando evaluate
    const pageData = await page.evaluate(() => {
      // Buscar scripts que contengan datos JSON
      const scripts = document.querySelectorAll('script');
      let jsonData: any = null;

      scripts.forEach(script => {
        const content = script.textContent || '';
        if (content.includes('"props":') && content.includes('"pageProps":')) {
          try {
            const jsonMatch = content.match(/\{"props":\{.*?\}\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              jsonData = parsed.props?.pageProps?.data;
            }
          } catch (e) {
            // Ignorar errores
          }
        }
      });

      // También buscar imágenes directamente en el DOM
      const images: string[] = [];
      const imgElements = document.querySelectorAll('img');
      imgElements.forEach(img => {
        const src = img.getAttribute('src');
        if (src && src.includes('infocasas')) {
          images.push(src);
        }
      });

      return { jsonData, domImages: images };
    });

    console.log('🔍 Analizando contenido de la página...\n');
    const propertyData = pageData.jsonData;

    console.log(`📊 Imágenes encontradas en DOM: ${pageData.domImages.length}`);
    pageData.domImages.forEach((img, idx) => {
      console.log(`   ${idx + 1}. ${img}`);
    });

    if (propertyData) {
      console.log('✅ DATOS JSON ENCONTRADOS:\n');
      console.log(`📝 ID: ${propertyData.id}`);
      console.log(`📝 Título: ${propertyData.title}`);
      console.log(`💰 Precio: $${propertyData.price?.amount?.toLocaleString()}`);
      console.log(`💰 Administración: $${propertyData.commonExpenses?.amount?.toLocaleString() || 0}`);
      console.log(`📐 Área: ${propertyData.m2 || propertyData.m2Built} m²`);
      console.log(`🛏️  Habitaciones: ${propertyData.bedrooms}`);
      console.log(`🚿 Baños: ${propertyData.bathrooms}`);
      console.log(`🚗 Parqueaderos: ${propertyData.garage}`);
      console.log(`📍 Dirección: ${propertyData.address}`);
      console.log(`📍 Barrio: ${propertyData.locations?.location_main?.name}`);
      console.log(`📍 Ciudad: ${propertyData.locations?.city?.[0]?.name}`);

      // ANÁLISIS DETALLADO DE IMÁGENES
      console.log(`\n🖼️  ANÁLISIS DE IMÁGENES:`);

      // Imagen principal
      if (propertyData.img) {
        console.log(`   📷 Imagen principal: ${propertyData.img}`);
        console.log(`      ✅ Válida: ${propertyData.img.startsWith('http')}`);
        console.log(`      🌐 Dominio: ${propertyData.img.includes('infocasas') ? 'InfoCasas' : 'Otro'}`);
      }

      // Array de imágenes
      if (propertyData.images && Array.isArray(propertyData.images)) {
        console.log(`   📷 Total imágenes en array: ${propertyData.images.length}`);
        propertyData.images.forEach((imgObj: any, idx: number) => {
          const imgUrl = imgObj.image || imgObj.src || imgObj;
          console.log(`      ${idx + 1}. ${imgUrl}`);
          if (typeof imgUrl === 'string') {
            console.log(`         ✅ Válida: ${imgUrl.startsWith('http')}`);
            console.log(`         🌐 Dominio: ${imgUrl.includes('infocasas') ? 'InfoCasas' : 'Otro'}`);
          }
        });
      }

      console.log(`\n📄 Descripción: ${propertyData.description?.substring(0, 200)}...`);

    } else {
      console.log('❌ NO SE ENCONTRARON DATOS JSON');
    }
  } catch (error) {
    console.error('❌ Error durante el scraping:', error);
  } finally {
    await browser.close();
  }
}

// Ejecutar el test
testFincaraizSpecific().catch(console.error);
