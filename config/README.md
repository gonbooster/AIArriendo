# Configuration Constants

This directory contains centralized configuration constants for the AI Arriendo project. This system eliminates hardcoded values and magic numbers throughout the codebase, making the application more maintainable and configurable.

## Files Overview

### `constants.ts`
Main configuration file containing all application constants organized by category:

- **APP**: Application metadata (name, version, description)
- **SERVER**: Server configuration (ports, timeouts, endpoints)
- **SEARCH**: Search and pagination settings
- **SCRAPING**: Web scraping configuration
- **LOCATION**: Geographic defaults
- **PROPERTY_DEFAULTS**: Default property criteria
- **SOURCE_PERFORMANCE**: Per-source scraping performance settings
- **RATE_LIMIT**: API rate limiting configuration
- **DATABASE**: Database connection settings
- **SCORING**: Property scoring and preference weights
- **FRONTEND**: Frontend-specific constants
- **LOGGING**: Logging configuration
- **VALIDATION**: Input validation constants

### `urls.ts`
URL management for scraping sources:

- **BASE_URLS**: Base URLs for all scraping sources
- **URL_PATTERNS**: URL patterns and parameters for each source
- **URLBuilder**: Class with static methods to build URLs for each source
- **Helper functions**: URL normalization and utility functions

### `default-criteria.ts`
Pre-configured search criteria for different scenarios:

- **MINIMAL_CRITERIA**: Basic search with broad parameters
- **FRONTEND_DEFAULT_CRITERIA**: Default criteria for web interface
- **SCRAPER_TEST_CRITERIA**: Ultra-broad criteria for testing scrapers
- **LUXURY_CRITERIA**: High-end property search criteria
- **BUDGET_CRITERIA**: Budget-conscious search criteria
- **Helper functions**: Create criteria for specific ranges

## Usage Examples

### Using Constants in Code

```typescript
// Before (hardcoded values)
const timeout = 150000;
const port = 8080;
const limit = 200;

// After (using constants)
import { SERVER, SEARCH } from '../config/constants';
const timeout = SERVER.TIMEOUT_MS;
const port = SERVER.DEFAULT_PORT;
const limit = SEARCH.DEFAULT_LIMIT;
```

### Building URLs

```typescript
// Before (hardcoded URL building)
const url = `https://www.fincaraiz.com.co/arriendo/apartamento/bogota/${neighborhood}?ad_type=2`;

// After (using URL builder)
import { URLBuilder } from '../config/urls';
const url = URLBuilder.fincaraiz(neighborhood);
```

### Using Default Criteria

```typescript
// Before (hardcoded criteria)
const criteria = {
  hardRequirements: {
    operation: 'arriendo',
    minRooms: 1,
    maxRooms: 10,
    // ... many more hardcoded values
  }
};

// After (using default criteria)
import { MINIMAL_CRITERIA, createNeighborhoodCriteria } from '../config/default-criteria';
const criteria = createNeighborhoodCriteria('Chapinero');
```

## Benefits

### 1. **Maintainability**
- All configuration in one place
- Easy to update values across the entire application
- Reduces risk of inconsistencies

### 2. **Type Safety**
- TypeScript ensures correct usage
- Compile-time checking of constant references
- IntelliSense support for all constants

### 3. **Documentation**
- Constants are self-documenting
- Clear organization by category
- Comments explain purpose and units

### 4. **Environment Flexibility**
- Easy to override constants via environment variables
- Different configurations for development/production
- Centralized environment variable handling

### 5. **Testing**
- Consistent test data
- Easy to create test scenarios
- Predictable behavior across tests

## Migration Guide

### Step 1: Import Constants
Add the appropriate import to your file:

```typescript
import { SERVER, SEARCH, LOCATION } from '../config/constants';
```

### Step 2: Replace Hardcoded Values
Replace magic numbers and strings with constants:

```typescript
// Replace
const port = 8080;
// With
const port = SERVER.DEFAULT_PORT;
```

### Step 3: Use URL Builders
Replace manual URL construction:

```typescript
// Replace
const url = `https://www.fincaraiz.com.co/arriendo/apartamento/bogota/${neighborhood}`;
// With
const url = URLBuilder.fincaraiz(neighborhood);
```

### Step 4: Use Default Criteria
Replace hardcoded search criteria:

```typescript
// Replace inline criteria objects
// With
import { MINIMAL_CRITERIA } from '../config/default-criteria';
```

## Environment Variables

Many constants can be overridden via environment variables:

```bash
# Server configuration
PORT=8080
TIMEOUT_MS=150000

# Scraping configuration
SCRAPER_MAX_PAGES=3
SCRAPER_TIMEOUT_MS=70000

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

## Adding New Constants

### 1. Add to `constants.ts`
```typescript
export const NEW_CATEGORY = {
  SETTING_NAME: 'default_value',
  ANOTHER_SETTING: 42,
} as const;
```

### 2. Update Imports
Add the new category to relevant import statements:

```typescript
import { SERVER, SEARCH, NEW_CATEGORY } from '../config/constants';
```

### 3. Replace Hardcoded Values
Find and replace hardcoded values throughout the codebase.

### 4. Update Documentation
Add documentation for the new constants in this README.

## Best Practices

### 1. **Use Descriptive Names**
- `SERVER.DEFAULT_PORT` instead of `DEFAULT_PORT`
- `SEARCH.SPECIAL_CHARS` instead of `SPECIAL_CHARACTERS`

### 2. **Group Related Constants**
- Keep related constants in the same category
- Use nested objects for sub-categories

### 3. **Use `as const`**
- Ensures TypeScript treats values as literals
- Provides better type checking and IntelliSense

### 4. **Document Units**
- Include units in names: `TIMEOUT_MS`, `DELAY_SECONDS`
- Add comments for complex values

### 5. **Environment Override Pattern**
```typescript
const value = Number(process.env.ENV_VAR) || CONSTANTS.DEFAULT_VALUE;
```

## Validation

The constants system includes validation helpers in `VALIDATION`:

```typescript
import { VALIDATION } from '../config/constants';

// Validate input lengths
if (query.length < VALIDATION.MIN_SEARCH_QUERY_LENGTH) {
  throw new Error('Query too short');
}

// Validate numeric ranges
if (price > VALIDATION.MAX_VALID_PRICE) {
  throw new Error('Price too high');
}
```

## Performance Considerations

### Source-Specific Performance Settings
Each scraping source has optimized performance settings in `SOURCE_PERFORMANCE`:

```typescript
import { SOURCE_PERFORMANCE } from '../config/constants';

const settings = SOURCE_PERFORMANCE.fincaraiz;
// {
//   requestsPerMinute: 30,
//   delayBetweenRequests: 2000,
//   maxConcurrentRequests: 2,
//   timeoutMs: 60000,
//   maxPages: 3
// }
```

These settings are tuned for each source's rate limiting and response characteristics.

## Troubleshooting

### Common Issues

1. **Import Path Errors**
   - Use relative paths: `../config/constants` or `../../config/constants`
   - Check file location relative to config directory

2. **TypeScript Errors**
   - Ensure `as const` is used for constant objects
   - Import the correct constant category

3. **Runtime Errors**
   - Check that environment variables are properly set
   - Verify constant values are appropriate for your environment

### Debugging

Enable debug logging to see which constants are being used:

```typescript
import { logger } from '../utils/logger';
import { SERVER } from '../config/constants';

logger.debug(`Using port: ${SERVER.DEFAULT_PORT}`);
```
