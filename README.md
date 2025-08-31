# 🏠 AI Arriendo Pro

Buscador profesional de arriendos con scrapers escalables para el mercado inmobiliario colombiano.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
cd client && npm install
```

### 2. Start the Application
```bash
# Development mode
npm run dev:server  # Start backend server
npm run client      # Start React client (port 3000)

# Production mode
npm run build       # Build both server and client
npm start          # Start production server
```

## 📁 Project Structure

```
AIArriendo/
├── core/               # 🏗️ Core business logic
│   ├── scraping/       # 🕷️ Web scrapers for each property site
│   ├── services/       # 🔧 Business services
│   ├── utils/          # 🛠️ Utilities and helpers
│   └── types.ts        # 📝 TypeScript interfaces
├── client/             # ⚛️ React frontend application
│   ├── src/
│   │   ├── pages/      # React pages
│   │   ├── components/ # UI components
│   │   └── services/   # API and data services
├── config/             # ⚙️ Configuration files
├── routes/             # 🛣️ API routes
├── controllers/        # 🎮 API controllers
└── server.ts           # 🚀 Express server
```

## 🕷️ Available Scrapers

| Website | Status | Properties |
|---------|--------|------------|
| Ciencuadras | ✅ Working | ~25+ |
| MercadoLibre | ✅ Working | ~25+ |
| Fincaraiz | ✅ Working | ~25+ |
| Metrocuadrado | ✅ Working | ~25+ |
| Properati | ✅ Working | ~25+ |
| Trovit | ✅ Working | ~25+ |
| Rentola | ✅ Working | ~25+ |
| PADS | ✅ Working | ~25+ |
| Arriendo.com | ✅ Working | ~25+ |

## 📊 Features

- **Real Data**: Extracts real property listings from multiple sources
- **Smart Filtering**: Advanced search with price, rooms, area, location filters
- **React Frontend**: Modern Material-UI interface
- **TypeScript**: Full type safety throughout the application
- **Git Safe**: Scraped data files are excluded from version control

## 🛠️ Development

### API Endpoints
- `POST /api/search` - Search properties with criteria
- `GET /api/dashboard/stats` - Get dashboard statistics

### Architecture
- **Backend**: Express.js + TypeScript
- **Frontend**: React + Material-UI
- **Scrapers**: Puppeteer + Cheerio
- **Database**: In-memory (Redis optional)

### Debug Mode
Set `headless: false` in scraper files to see browser automation.

## 📝 URLs
- **Frontend**: http://localhost:3001 (React app)
- **Data Files**: Available in `client/public/output/`