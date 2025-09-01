import { TrovitScraper } from '../scraping/scrapers/TrovitScraper';
import { MetrocuadradoScraper } from '../scraping/scrapers/MetrocuadradoScraper';
import { MercadoLibreScraper } from '../scraping/scrapers/MercadoLibreScraper';
import { PadsScraper } from '../scraping/scrapers/PadsScraper';
import { FincaraizScraper } from '../scraping/scrapers/FincaraizScraper';
import { CiencuadrasScraper } from '../scraping/scrapers/CiencuadrasScraper';
import { ArriendoScraper } from '../scraping/scrapers/ArriendoScraper';
// Definir tipo Property localmente para evitar dependencias
interface Property {
  id: string;
  title: string;
  price: number;
  area?: number;
  rooms?: number;
  bathrooms?: number;
  parking?: number;
  stratum?: number;
  images?: string[];
  [key: string]: any;
}

interface TestResult {
  provider: string;
  success: boolean;
  propertiesFound: number;
  dataQuality: {
    withRooms: number;
    withArea: number;
    withParking: number;
    withStratum: number;
    withImages: number;
  };
  sampleProperty?: Property;
  error?: string;
}

class ScraperTester {
  private async testScraper(
    scraperClass: any,
    providerName: string,
    testUrl?: string
  ): Promise<TestResult> {
    console.log(`\n🧪 Testing ${providerName}...`);

    try {
      const scraper = new scraperClass();

      // Crear parámetros de búsqueda básicos para evitar el error de hardRequirements
      const searchParams = {
        hardRequirements: {
          location: 'Bogotá',
          maxPrice: 5000000,
          minPrice: 500000
        },
        softRequirements: {},
        page: 1
      };

      // Usar URL de test específica o pasar parámetros de búsqueda
      const properties = testUrl ?
        await scraper.scrape(testUrl) :
        await scraper.scrape(searchParams);
      
      if (!properties || properties.length === 0) {
        return {
          provider: providerName,
          success: false,
          propertiesFound: 0,
          dataQuality: {
            withRooms: 0,
            withArea: 0,
            withParking: 0,
            withStratum: 0,
            withImages: 0
          },
          error: 'No properties found'
        };
      }

      // Analizar calidad de datos
      const dataQuality = {
        withRooms: properties.filter((p: Property) => p.rooms && p.rooms > 0).length,
        withArea: properties.filter((p: Property) => p.area && p.area > 0).length,
        withParking: properties.filter((p: Property) => p.parking && p.parking > 0).length,
        withStratum: properties.filter((p: Property) => p.stratum && p.stratum > 0).length,
        withImages: properties.filter((p: Property) => p.images && p.images.length > 0).length
      };

      // Tomar una propiedad de muestra con datos
      const sampleProperty = properties.find((p: Property) =>
        (p.rooms && p.rooms > 0) || (p.area && p.area > 0) || (p.parking && p.parking > 0) || (p.stratum && p.stratum > 0)
      ) || properties[0];

      return {
        provider: providerName,
        success: true,
        propertiesFound: properties.length,
        dataQuality,
        sampleProperty
      };

    } catch (error) {
      return {
        provider: providerName,
        success: false,
        propertiesFound: 0,
        dataQuality: {
          withRooms: 0,
          withArea: 0,
          withParking: 0,
          withStratum: 0,
          withImages: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private printResults(results: TestResult[]): void {
    console.log('\n📊 RESULTADOS DE TESTS DE SCRAPERS');
    console.log('='.repeat(80));
    
    results.forEach(result => {
      console.log(`\n🏢 ${result.provider.toUpperCase()}`);
      console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (result.error) {
        console.log(`Error: ${result.error}`);
        return;
      }
      
      console.log(`Properties found: ${result.propertiesFound}`);
      
      if (result.propertiesFound > 0) {
        const { dataQuality } = result;
        const total = result.propertiesFound;
        
        console.log('\n📈 Data Quality:');
        console.log(`  🏠 Rooms: ${dataQuality.withRooms}/${total} (${((dataQuality.withRooms/total)*100).toFixed(1)}%)`);
        console.log(`  📐 Area: ${dataQuality.withArea}/${total} (${((dataQuality.withArea/total)*100).toFixed(1)}%)`);
        console.log(`  🚗 Parking: ${dataQuality.withParking}/${total} (${((dataQuality.withParking/total)*100).toFixed(1)}%)`);
        console.log(`  🏢 Stratum: ${dataQuality.withStratum}/${total} (${((dataQuality.withStratum/total)*100).toFixed(1)}%)`);
        console.log(`  🖼️ Images: ${dataQuality.withImages}/${total} (${((dataQuality.withImages/total)*100).toFixed(1)}%)`);
        
        if (result.sampleProperty) {
          console.log('\n🔍 Sample Property:');
          console.log(`  Title: ${result.sampleProperty.title.substring(0, 50)}...`);
          console.log(`  Price: $${result.sampleProperty.price.toLocaleString()}`);
          console.log(`  Rooms: ${result.sampleProperty.rooms || 0}`);
          console.log(`  Area: ${result.sampleProperty.area || 0} m²`);
          console.log(`  Parking: ${result.sampleProperty.parking || 0}`);
          console.log(`  Stratum: ${result.sampleProperty.stratum || 0}`);
          console.log(`  Images: ${result.sampleProperty.images?.length || 0}`);
        }
      }
    });
    
    // Resumen general
    const successful = results.filter(r => r.success).length;
    const totalProperties = results.reduce((sum, r) => sum + r.propertiesFound, 0);
    
    console.log('\n📋 RESUMEN GENERAL');
    console.log('='.repeat(40));
    console.log(`Scrapers exitosos: ${successful}/${results.length}`);
    console.log(`Total propiedades encontradas: ${totalProperties}`);
    
    // Identificar problemas
    const problematicScrapers = results.filter(r => 
      r.success && r.propertiesFound > 0 && (
        r.dataQuality.withRooms === 0 || 
        r.dataQuality.withArea === 0
      )
    );
    
    if (problematicScrapers.length > 0) {
      console.log('\n⚠️ SCRAPERS CON PROBLEMAS DE DATOS:');
      problematicScrapers.forEach(r => {
        console.log(`  ${r.provider}: Faltan datos básicos (rooms/area)`);
      });
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Iniciando tests de todos los scrapers...');
    
    const tests = [
      { class: TrovitScraper, name: 'Trovit' },
      { class: MetrocuadradoScraper, name: 'Metrocuadrado' },
      { class: MercadoLibreScraper, name: 'MercadoLibre' },
      { class: PadsScraper, name: 'PADS' },
      { class: FincaraizScraper, name: 'Fincaraiz' },
      { class: CiencuadrasScraper, name: 'Ciencuadras' },
      { class: ArriendoScraper, name: 'Arriendo' }
    ];

    const results: TestResult[] = [];
    
    for (const test of tests) {
      const result = await this.testScraper(test.class, test.name);
      results.push(result);
      
      // Pausa entre tests para no sobrecargar los sitios
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    this.printResults(results);
  }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
  const tester = new ScraperTester();
  tester.runAllTests().catch(console.error);
}

export { ScraperTester };
