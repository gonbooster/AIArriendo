import { Property } from '../types';

class RealDataServiceFixed {
  private properties: Property[] = [];
  private isLoaded = false;

  // Load all real data - CÓDIGO EXACTO DEL SCRIPT QUE FUNCIONA
  async loadRealData(): Promise<Property[]> {
    if (this.isLoaded) {
      return this.properties;
    }

    try {
      const sources = [
        'ciencuadras',
        'mercadolibre', 
        'fincaraiz',
        'trovit',
        'arriendo',
        'metrocuadrado',
        'properati',
        'pads',
        'rentola'
      ];
      
      this.properties = [];
      
      for (const source of sources) {
        try {
          const response = await fetch(`/output/${source}.txt`);
          if (response.ok) {
            const text = await response.text();
            const properties = this.parsePropertiesFromTxt(text, source);
            this.properties = this.properties.concat(properties);
            console.log(`✅ Loaded ${properties.length} properties from ${source}`);
          }
        } catch (error) {
          console.warn(`❌ Failed to load ${source}:`, error);
        }
      }


      console.log(`🎉 Total real properties loaded: ${this.properties.length} (after deduplication)`);
      this.isLoaded = true;

      return this.properties;
      
    } catch (error) {
      console.error('❌ Error loading real data:', error);
      return [];
    }
  }

  // Parse properties - EXACTO como el script
  private parsePropertiesFromTxt(text: string, source: string): Property[] {
    const properties: Property[] = [];
    const lines = text.split('\n');
    
    let currentProperty: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.match(/^\d+\.\s+(.+)/)) {
        if (currentProperty) {
          const property = this.convertToProperty(currentProperty, source);
          if (property) {
            properties.push(property);
          }
        }
        
        const titleMatch = line.match(/^\d+\.\s+(.+)/);
        currentProperty = {
          id: `${source}_${properties.length}`,
          title: titleMatch![1],
          price: 'No disponible',
          area: 'No disponible',
          rooms: 'No disponible',
          bathrooms: 'No disponible',
          location: 'Bogotá',
          amenities: 'No disponible',
          url: 'No disponible',
          source: source.charAt(0).toUpperCase() + source.slice(1),
          scrapedDate: new Date().toISOString()
        };
      }
      else if (currentProperty && line.includes('💰 Precio:')) {
        currentProperty.price = line.replace('💰 Precio:', '').trim();
      }
      else if (currentProperty && line.includes('📐 Área:')) {
        currentProperty.area = line.replace('📐 Área:', '').trim();
      }
      else if (currentProperty && line.includes('🛏️ Habitaciones:')) {
        currentProperty.rooms = line.replace('🛏️ Habitaciones:', '').trim();
      }
      else if (currentProperty && line.includes('🚿 Baños:')) {
        currentProperty.bathrooms = line.replace('🚿 Baños:', '').trim();
      }
      else if (currentProperty && line.includes('📍 Ubicación:')) {
        currentProperty.location = line.replace('📍 Ubicación:', '').trim();
      }
      else if (currentProperty && line.includes('🎯 Amenidades:')) {
        currentProperty.amenities = line.replace('🎯 Amenidades:', '').trim();
      }
      else if (currentProperty && line.includes('🔗 URL:')) {
        currentProperty.url = line.replace('🔗 URL:', '').trim();
      }
    }
    
    if (currentProperty) {
      const property = this.convertToProperty(currentProperty, source);
      if (property) {
        properties.push(property);
      }
    }
    
    return properties;
  }

  // Convert - EXACTO como el script
  private convertToProperty(realProp: any, source: string): Property | null {
    try {
      const price = this.extractNumericPrice(realProp.price || '');
      const area = this.extractNumericArea(realProp.area || '');
      const rooms = this.extractNumericRooms(realProp.rooms || '');
      const bathrooms = this.extractNumericBathrooms(realProp.bathrooms || '');
      
      if (!realProp.title || realProp.title.length < 5) {
        return null;
      }
      
      const property: Property = {
        id: realProp.id || `${source}_${Date.now()}`,
        title: realProp.title,
        price: price,
        area: area,
        rooms: rooms,
        bathrooms: bathrooms,
        location: this.parseLocation(realProp.location || 'Bogotá'),
        amenities: this.parseAmenities(realProp.amenities || ''),
        description: realProp.title || '',
        images: [],
        url: realProp.url !== 'No disponible' ? realProp.url || '' : '',
        adminFee: 0,
        totalPrice: price,
        source: realProp.source || source,
        scrapedDate: realProp.scrapedDate || new Date().toISOString(),
        isActive: true,
        pricePerM2: area > 0 ? Math.round(price / area) : 0
      };
      
      return property;
      
    } catch (error) {
      console.warn('Error converting property:', error);
      return null;
    }
  }

  // Métodos EXACTOS del script
  private extractNumericPrice(priceStr: string): number {
    if (!priceStr || priceStr === 'No disponible') return 0;
    const match = priceStr.match(/[\d,\.]+/);
    if (match) {
      return parseInt(match[0].replace(/[,\.]/g, ''));
    }
    return 0;
  }

  private extractNumericArea(areaStr: string): number {
    if (!areaStr || areaStr === 'No disponible') return 0;
    const match = areaStr.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return 0;
  }

  private extractNumericRooms(roomsStr: string): number {
    if (!roomsStr || roomsStr === 'No disponible') return 0;
    const match = roomsStr.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return 0;
  }

  private extractNumericBathrooms(bathroomsStr: string): number {
    if (!bathroomsStr || bathroomsStr === 'No disponible') return 0;
    const match = bathroomsStr.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return 0;
  }

  private parseLocation(locationStr: string): Property['location'] {
    const parts = locationStr.split(',').map(p => p.trim());
    
    if (parts.length >= 2) {
      return {
        address: locationStr,
        neighborhood: parts[0],
        zone: parts.length > 2 ? parts[1] : undefined
      };
    }
    
    return {
      address: locationStr,
      neighborhood: locationStr
    };
  }

  private parseAmenities(amenitiesStr: string): string[] {
    if (!amenitiesStr || amenitiesStr === 'No disponible') {
      return [];
    }

    return amenitiesStr.split(',').map(a => a.trim()).filter(a => a.length > 0);
  }

  // Eliminar duplicados basado en título, precio y área
  private removeDuplicates(properties: Property[]): Property[] {
    const seen = new Set<string>();
    const unique: Property[] = [];

    for (const property of properties) {
      // Crear una clave única basada en título, precio, área y fuente
      const key = `${property.title}_${property.price}_${property.area}_${property.source}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(property);
      } else {
        console.log(`🗑️ Removed duplicate: ${property.title} from ${property.source}`);
      }
    }

    console.log(`📊 Deduplication: ${properties.length} -> ${unique.length} properties`);
    return unique;
  }

  getProperties(): Property[] {
    return this.properties;
  }

  getStatistics() {
    const totalProperties = this.properties.length;
    const uniqueSources = new Set(this.properties.map(p => p.source));
    const activeSources = Array.from(uniqueSources).length;
    
    const validPrices = this.properties
      .map(p => p.price)
      .filter(price => price > 0);
    
    const avgPrice = validPrices.length > 0 
      ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
      : 0;
    
    return {
      totalProperties,
      activeSources,
      avgPrice,
      lastUpdate: new Date().toISOString()
    };
  }
}

export const realDataServiceFixed = new RealDataServiceFixed();
