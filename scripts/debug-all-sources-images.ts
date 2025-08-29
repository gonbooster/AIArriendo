#!/usr/bin/env tsx

/**
 * Debug images and URLs from ALL sources in your exact search
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function debugAllSourcesImages() {
  console.log('🔍 DEBUGGING ALL SOURCES - IMAGES AND URLS\n');

  try {
    const searchService = new SearchService();

    // Your EXACT search criteria that returns only 2 results
    const criteria: SearchCriteria = {
      hardRequirements: {
        minRooms: 3,
        maxRooms: 4,
        minBathrooms: 2,
        maxBathrooms: 3,
        minParking: 0,
        maxParking: 2,
        minArea: 70,
        maxArea: 110,
        minTotalPrice: 500000,
        maxTotalPrice: 3500000,
        allowAdminOverage: false,
        minStratum: 3,
        maxStratum: 5,
        propertyTypes: ['Apartamento'],
        operation: 'arriendo',
        location: {
          city: 'Bogotá',
          neighborhoods: ['Usaquén'],
          zones: []
        }
      },
      preferences: {
        wetAreas: [],
        sports: [],
        amenities: [],
        weights: {
          wetAreas: 1,
          sports: 1,
          amenities: 0.8,
          location: 0.6,
          pricePerM2: 0.4
        }
      },
      optionalFilters: {}
    };

    console.log('🔍 Executing search with YOUR EXACT CRITERIA...\n');
    const result = await searchService.search(criteria, 1, 48);
    
    console.log(`📊 SEARCH RESULTS: ${result.properties.length} properties found\n`);

    if (result.properties.length === 0) {
      console.log('❌ No properties found to analyze');
      return;
    }

    console.log('🔍 ANALYZING ALL PROPERTIES:\n');

    result.properties.forEach((prop, index) => {
      console.log(`🏠 PROPERTY ${index + 1}: ${prop.source}`);
      console.log(`   Title: ${prop.title.substring(0, 50)}...`);
      console.log(`   Price: $${prop.totalPrice.toLocaleString()}`);
      console.log(`   Rooms: ${prop.rooms}, Bathrooms: ${prop.bathrooms}, Area: ${prop.area}m²`);
      console.log(`   Location: ${prop.location.address || prop.location.neighborhood}`);
      
      // Check URL
      console.log(`   🔗 URL: ${prop.url || 'NO URL'}`);
      if (!prop.url || prop.url === '') {
        console.log(`   ❌ MISSING URL!`);
      } else if (prop.url.startsWith('http')) {
        console.log(`   ✅ URL is valid`);
      } else {
        console.log(`   ⚠️  URL is relative: ${prop.url}`);
      }
      
      // Check images
      console.log(`   🖼️  Images: ${prop.images.length} found`);
      if (prop.images.length === 0) {
        console.log(`   ❌ NO IMAGES!`);
      } else {
        prop.images.forEach((img, imgIndex) => {
          console.log(`   📷 Image ${imgIndex + 1}: ${img.substring(0, 60)}...`);
          if (!img || img === '') {
            console.log(`   ❌ EMPTY IMAGE URL!`);
          } else if (img.startsWith('http')) {
            console.log(`   ✅ Image URL is valid`);
          } else {
            console.log(`   ⚠️  Image URL is relative: ${img}`);
          }
        });
      }
      
      console.log('');
    });

    // Summary by source
    console.log('📊 SUMMARY BY SOURCE:');
    const sources = [...new Set(result.properties.map(p => p.source))];
    sources.forEach(source => {
      const sourceProps = result.properties.filter(p => p.source === source);
      const withImages = sourceProps.filter(p => p.images.length > 0);
      const withValidImages = sourceProps.filter(p => p.images.length > 0 && p.images[0].startsWith('http'));
      const withUrls = sourceProps.filter(p => p.url && p.url !== '');
      const withValidUrls = sourceProps.filter(p => p.url && p.url.startsWith('http'));
      
      console.log(`\n   ${source}: ${sourceProps.length} properties`);
      console.log(`     ✅ With images: ${withImages.length}/${sourceProps.length}`);
      console.log(`     ✅ With valid images: ${withValidImages.length}/${sourceProps.length}`);
      console.log(`     ✅ With URLs: ${withUrls.length}/${sourceProps.length}`);
      console.log(`     ✅ With valid URLs: ${withValidUrls.length}/${sourceProps.length}`);
      
      if (withImages.length === 0) {
        console.log(`     ❌ ${source} HAS NO IMAGES!`);
      }
      if (withUrls.length === 0) {
        console.log(`     ❌ ${source} HAS NO URLS!`);
      }
    });

    // Overall summary
    const totalWithImages = result.properties.filter(p => p.images.length > 0).length;
    const totalWithValidImages = result.properties.filter(p => p.images.length > 0 && p.images[0].startsWith('http')).length;
    const totalWithUrls = result.properties.filter(p => p.url && p.url !== '').length;
    const totalWithValidUrls = result.properties.filter(p => p.url && p.url.startsWith('http')).length;

    console.log('\n📊 OVERALL SUMMARY:');
    console.log(`   Total properties: ${result.properties.length}`);
    console.log(`   Properties with images: ${totalWithImages}/${result.properties.length} (${Math.round(totalWithImages/result.properties.length*100)}%)`);
    console.log(`   Properties with valid images: ${totalWithValidImages}/${result.properties.length} (${Math.round(totalWithValidImages/result.properties.length*100)}%)`);
    console.log(`   Properties with URLs: ${totalWithUrls}/${result.properties.length} (${Math.round(totalWithUrls/result.properties.length*100)}%)`);
    console.log(`   Properties with valid URLs: ${totalWithValidUrls}/${result.properties.length} (${Math.round(totalWithValidUrls/result.properties.length*100)}%)`);

    if (totalWithImages < result.properties.length) {
      console.log('\n🚨 PROBLEM IDENTIFIED: Some sources are not providing images!');
    }
    if (totalWithUrls < result.properties.length) {
      console.log('\n🚨 PROBLEM IDENTIFIED: Some sources are not providing URLs!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug
debugAllSourcesImages().catch(console.error);
