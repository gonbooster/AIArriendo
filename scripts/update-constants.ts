/**
 * Script to update all files to use centralized constants
 * This script will automatically replace hardcoded values with constants
 */

import * as fs from 'fs';
import * as path from 'path';

// Files to update with their patterns
const FILES_TO_UPDATE = [
  // Schemas
  'core/schemas/metrocuadrado-schema.ts',
  'core/schemas/mercadolibre-schema.ts',
  'core/schemas/ciencuadras-schema.ts',
  'core/schemas/properati-schema.ts',
  'core/schemas/trovit-schema.ts',
  'core/schemas/fincaraiz-schema.ts',
  
  // Rate limiter
  'middleware/rateLimiter.ts',
  
  // Server
  'server.ts',
  
  // Environment files
  'client/.env.production',
  'client/.env.development',
];

// Replacement patterns
const REPLACEMENTS = [
  // Property defaults
  { pattern: /'Apartamento'/g, replacement: 'SEARCH.DEFAULT_PROPERTY_TYPE' },
  { pattern: /'Bogotá'/g, replacement: 'LOCATION.DEFAULT_CITY' },
  { pattern: /coordinates: \{ lat: 0, lng: 0 \}/g, replacement: 'coordinates: LOCATION.DEFAULT_COORDINATES' },
  
  // Performance settings
  { pattern: /requestsPerMinute: 30/g, replacement: 'requestsPerMinute: SOURCE_PERFORMANCE.fincaraiz.requestsPerMinute' },
  { pattern: /requestsPerMinute: 25/g, replacement: 'requestsPerMinute: SOURCE_PERFORMANCE.metrocuadrado.requestsPerMinute' },
  { pattern: /requestsPerMinute: 20/g, replacement: 'requestsPerMinute: SOURCE_PERFORMANCE.mercadolibre.requestsPerMinute' },
  
  // Timeouts
  { pattern: /timeout: 150000/g, replacement: 'timeout: SERVER.TIMEOUT_MS' },
  { pattern: /timeoutMs: 60000/g, replacement: 'timeoutMs: 60000' },
  { pattern: /timeoutMs: 70000/g, replacement: 'timeoutMs: 70000' },
  
  // Ports
  { pattern: /8080/g, replacement: 'SERVER.DEFAULT_PORT' },
  { pattern: /3000/g, replacement: 'FRONTEND.DEVELOPMENT_PORTS[0]' },
  
  // Limits
  { pattern: /limit = 200/g, replacement: 'limit = SEARCH.DEFAULT_LIMIT' },
  { pattern: /page = 1/g, replacement: 'page = SEARCH.DEFAULT_PAGE' },
];

function updateFile(filePath: string): void {
  try {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let hasChanges = false;
    
    // Add import statement if needed
    if (content.includes('Apartamento') || content.includes('Bogotá') || content.includes('8080')) {
      if (!content.includes('from \'../../config/constants\'') && !content.includes('from \'../config/constants\'')) {
        // Determine correct import path
        const importPath = filePath.includes('core/') ? '../../config/constants' : '../config/constants';
        
        // Find the last import statement
        const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
        if (importLines.length > 0) {
          const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
          const insertPosition = content.indexOf('\n', lastImportIndex) + 1;
          
          content = content.slice(0, insertPosition) + 
                   `import { SEARCH, LOCATION, SERVER, FRONTEND, SOURCE_PERFORMANCE } from '${importPath}';\n` +
                   content.slice(insertPosition);
          hasChanges = true;
        }
      }
    }
    
    // Apply replacements
    for (const { pattern, replacement } of REPLACEMENTS) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`📄 No changes needed: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
  }
}

function main(): void {
  console.log('🔄 Starting constants update process...\n');
  
  for (const file of FILES_TO_UPDATE) {
    updateFile(file);
  }
  
  console.log('\n✅ Constants update process completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the changes in each file');
  console.log('2. Test the application to ensure everything works');
  console.log('3. Commit the changes');
}

if (require.main === module) {
  main();
}

export { updateFile, REPLACEMENTS };
