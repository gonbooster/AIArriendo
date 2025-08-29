# 🏠 AI Arriendo Pro

Buscador profesional de arriendos con scrapers escalables para el mercado inmobiliario colombiano.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
cd client && npm install
```

### 2. Run Scrapers
```bash
# Run all scrapers
npm run scrape:all

# Run specific scraper
npm run scrape:ciencuadras
npm run scrape:mercadolibre
npm run scrape:fincaraiz
```

### 3. Copy Data to React App
```bash
npm run copy-data
```

### 4. Start the Application
```bash
# Start React client (port 3001)
cd client && npm start
```

## 📁 Project Structure

```
AIArriendo/
├── scrapers/           # 🕷️ Web scrapers for each property site
│   ├── index.ts        # Main scraper manager
│   ├── ciencuadras.ts  # Ciencuadras.com scraper
│   ├── mercadolibre.ts # MercadoLibre scraper
│   └── fincaraiz.ts    # Fincaraiz.com scraper
├── client/             # ⚛️ React frontend application
│   ├── src/
│   │   ├── pages/      # React pages
│   │   ├── services/   # API and data services
│   │   └── types/      # TypeScript interfaces
│   └── public/output/  # Scraped data files
├── output/             # 📊 Raw scraped data (git ignored)
├── scripts/            # 🛠️ Utility scripts
└── README.md           # This file
```

## 🕷️ Available Scrapers

| Website | Status | Properties | Command |
|---------|--------|------------|---------|
| Ciencuadras | ✅ Working | ~25 | `npm run scrape:ciencuadras` |
| MercadoLibre | ✅ Working | ~25 | `npm run scrape:mercadolibre` |
| Fincaraiz | ✅ Working | ~25 | `npm run scrape:fincaraiz` |

## 📊 Features

- **Real Data**: Extracts real property listings from multiple sources
- **Smart Filtering**: Advanced search with price, rooms, area, location filters
- **React Frontend**: Modern Material-UI interface
- **TypeScript**: Full type safety throughout the application
- **Git Safe**: Scraped data files are excluded from version control

## 🛠️ Development

### Run Individual Scraper
```bash
npx ts-node scrapers/ciencuadras.ts
```

### Debug Mode
Set `headless: false` in scraper files to see browser automation.

## 📝 URLs
- **Frontend**: http://localhost:3001 (React app)
- **Data Files**: Available in `client/public/output/`