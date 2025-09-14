# 🏠 AI Arriendo Pro

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/gonbooster/AIArriendo)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-19.1.1-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**AI Arriendo Pro** is a professional, scalable rental property search platform that aggregates listings from multiple Colombian real estate websites using advanced web scraping technology. Built with TypeScript, React, and Node.js, it provides real-time property data with intelligent scoring and filtering capabilities.

## 🌟 Key Features

### 🔍 **Multi-Source Property Aggregation**
- **7 Major Real Estate Sources**: Trovit, Metrocuadrado, MercadoLibre, PADS, Fincaraiz, Ciencuadras, Arriendo.com
- **Real-time Scraping**: Live data extraction with fallback mechanisms
- **Smart Deduplication**: Intelligent property matching across sources
- **Quality Assurance**: Automated data validation and cleaning

### 🎯 **Advanced Search & Filtering**
- **Hard Requirements**: Mandatory filters (price, rooms, area, location)
- **Soft Preferences**: Weighted scoring for amenities and features
- **Smart Location Detection**: Automatic city and neighborhood recognition
- **Dynamic Pricing**: Real-time price per m² calculations

### 🧠 **Intelligent Property Scoring**
- **Multi-factor Algorithm**: Price, location, amenities, and preference matching
- **Personalized Rankings**: Tailored results based on user preferences
- **Quality Metrics**: Property completeness and data reliability scoring
- **Recommendation Engine**: ML-ready architecture for future enhancements

### 🚀 **High-Performance Architecture**
- **Scalable Scraping**: Rate-limited, concurrent data extraction
- **Caching Strategy**: Redis-based performance optimization
- **Real-time Updates**: WebSocket integration for live progress tracking
- **Error Recovery**: Robust fallback mechanisms and retry logic

### 💻 **Modern User Interface**
- **Material-UI Design**: Professional, responsive interface
- **Real-time Progress**: Live scraping status and source tracking
- **Advanced Filters**: Intuitive search controls with instant feedback
- **Property Cards**: Rich property display with images and key metrics

## 🏗️ Technical Architecture

### **Backend Stack**
- **Runtime**: Node.js 20+ with TypeScript 5.0
- **Framework**: Express.js with comprehensive middleware
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for performance optimization
- **Scraping**: Puppeteer + Cheerio for robust data extraction
- **Logging**: Winston with structured logging
- **Testing**: Jest with comprehensive test suites

### **Frontend Stack**
- **Framework**: React 19.1 with TypeScript
- **UI Library**: Material-UI (MUI) 5.18
- **State Management**: React Hooks with custom state management
- **Routing**: React Router DOM 7.8
- **Forms**: React Hook Form with Yup validation
- **Charts**: Recharts for data visualization
- **Real-time**: Socket.IO client for live updates

### **DevOps & Deployment**
- **Platform**: Railway with Nixpacks builder
- **CI/CD**: Automated build and deployment pipeline
- **Health Monitoring**: Comprehensive health checks and monitoring
- **Environment**: Production-ready configuration management

## 🚀 Quick Start

### Prerequisites
- Node.js 20.0.0 or higher
- npm 9.0.0 or higher
- MongoDB instance (optional for demo mode)
- Redis instance (optional for caching)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/gonbooster/AIArriendo.git
cd AIArriendo
```

2. **Install dependencies**
```bash
npm run setup
```

3. **Environment configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development servers**
```bash
# Start backend server
npm run dev:server

# Start frontend (in another terminal)
npm run client
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

## 📋 Available Scripts

### **Development**
```bash
npm run dev:server    # Start backend in development mode
npm run client        # Start React frontend
npm run setup         # Install all dependencies
```

### **Production**
```bash
npm run build:production  # Build for production
npm start                 # Start production server
```

### **Testing**
```bash
npm test              # Run all tests
npm run test:scrapers # Test scraping functionality
npm run test:location # Test location detection
npm run test:watch    # Run tests in watch mode
```

### **Utilities**
```bash
npm run clean         # Clean build artifacts
```

## 🔧 Configuration

### **Environment Variables**
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ai-arriendo
REDIS_URL=redis://localhost:6379

# Scraping Configuration
SCRAPING_TIMEOUT=30000
MAX_CONCURRENT_SCRAPERS=3
RATE_LIMIT_DELAY=1000

# Security
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### **Search Configuration**
The application supports extensive search customization through the `SearchCriteria` interface:

```typescript
interface SearchCriteria {
  hardRequirements: {
    minRooms: number;
    maxRooms?: number;
    minArea: number;
    maxArea?: number;
    maxTotalPrice: number;
    location: LocationCriteria;
    // ... more filters
  };
  preferences: {
    amenities: string[];
    weights: PreferenceWeights;
    // ... scoring preferences
  };
}
```

## 🕷️ Scraping Sources

| Source | Status | Properties | Data Quality | Special Features |
|--------|--------|------------|--------------|------------------|
| **Trovit** | ✅ Active | ~450/search | 85% complete | Multi-source aggregator |
| **Fincaraiz** | ✅ Active | ~5/search | 95% complete | Premium properties |
| **PADS** | ✅ Active | ~30/search | 90% complete | High-end rentals |
| **Ciencuadras** | ✅ Active | ~25/search | 85% complete | Regional coverage |
| **Arriendo.com** | ✅ Active | ~45/search | 80% complete | Diverse inventory |
| **Metrocuadrado** | ⚠️ Limited | Variable | 70% complete | Market leader |
| **MercadoLibre** | ⚠️ Limited | Variable | 75% complete | Popular platform |

## 📊 API Documentation

### **Search Endpoint**
```http
POST /api/search
Content-Type: application/json

{
  "hardRequirements": {
    "minRooms": 2,
    "minArea": 50,
    "maxTotalPrice": 2000000,
    "location": {
      "neighborhoods": ["Chapinero", "Zona Rosa"]
    }
  },
  "preferences": {
    "amenities": ["gym", "pool"],
    "weights": {
      "price": 0.4,
      "location": 0.3,
      "amenities": 0.3
    }
  }
}
```

### **Response Format**
```json
{
  "success": true,
  "data": {
    "properties": [...],
    "total": 150,
    "page": 1,
    "limit": 20,
    "summary": {
      "averagePrice": 1500000,
      "averagePricePerM2": 18000,
      "sourceBreakdown": {...}
    }
  }
}
```

## 🧪 Testing

The project includes comprehensive testing suites:

- **Unit Tests**: Core functionality and utilities
- **Integration Tests**: API endpoints and database operations
- **Scraper Tests**: Individual scraper validation and data quality
- **E2E Tests**: Complete user workflows

Run specific test suites:
```bash
npm run test:scrapers  # Test all scrapers
npm run test:location  # Test location detection
```

## 🚀 Deployment

### **Railway Deployment**
The application is configured for Railway deployment with automatic CI/CD:

1. **Connect Repository**: Link your GitHub repository to Railway
2. **Environment Variables**: Configure production environment variables
3. **Deploy**: Railway automatically builds and deploys on push

### **Manual Deployment**
```bash
# Build for production
npm run build:production

# Start production server
npm start
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure all scrapers pass quality tests

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Gonzalo** - [GitHub](https://github.com/gonbooster)

## 🙏 Acknowledgments

- Colombian real estate platforms for providing valuable property data
- Open source community for excellent tools and libraries
- Contributors and users for feedback and improvements

## 🔍 Advanced Features

### **Smart Location Detection**
- **Automatic Recognition**: Detects cities and neighborhoods from natural language
- **Confidence Scoring**: Validates location accuracy with confidence metrics
- **Fallback Mechanisms**: Handles ambiguous or incomplete location data
- **Multi-format Support**: Accepts various address formats and abbreviations

### **Real-time Progress Tracking**
- **Live Updates**: WebSocket-based progress monitoring during searches
- **Source Status**: Individual scraper progress and completion status
- **Error Handling**: Graceful degradation with detailed error reporting
- **Performance Metrics**: Search execution time and data quality statistics

### **Data Quality Assurance**
- **Validation Pipeline**: Multi-stage property data validation
- **Completeness Scoring**: Rates properties based on available information
- **Duplicate Detection**: Advanced algorithms to identify and merge duplicates
- **Image Verification**: Validates and normalizes property images

### **Caching & Performance**
- **Multi-level Caching**: Redis-based caching for improved response times
- **Smart Invalidation**: Intelligent cache refresh based on data freshness
- **Compression**: Optimized data storage and transfer
- **Rate Limiting**: Protects against abuse while maintaining performance

## 🛠️ Development Setup

### **Local Development Environment**

1. **Database Setup** (Optional - Demo mode available)
```bash
# MongoDB (using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Redis (using Docker)
docker run -d -p 6379:6379 --name redis redis:alpine
```

2. **Environment Configuration**
```env
# Development .env file
NODE_ENV=development
PORT=3001

# Database (optional)
MONGODB_URI=mongodb://localhost:27017/ai-arriendo-dev
REDIS_URL=redis://localhost:6379

# Scraping settings
SCRAPING_TIMEOUT=30000
MAX_CONCURRENT_SCRAPERS=3
RATE_LIMIT_DELAY=1000

# CORS for development
CORS_ORIGIN=http://localhost:3000
```

3. **IDE Configuration**
- **VSCode**: Recommended extensions for TypeScript, React, and MongoDB
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **TypeScript**: Strong typing and IntelliSense

### **Project Structure**
```
AIArriendo/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Frontend utilities
│   └── public/             # Static assets
├── core/                   # Core business logic
│   ├── scraping/           # Web scraping engine
│   │   ├── scrapers/       # Individual site scrapers
│   │   └── utils/          # Scraping utilities
│   ├── services/           # Business services
│   ├── types.ts            # Core type definitions
│   └── tests/              # Test suites
├── controllers/            # API controllers
├── routes/                 # Express route definitions
├── models/                 # Database models
├── config/                 # Configuration files
├── middleware/             # Express middleware
└── utils/                  # Server utilities
```

## 🔒 Security & Privacy

### **Data Protection**
- **No Personal Data Storage**: Only public property information is collected
- **Rate Limiting**: Prevents abuse and respects source website policies
- **User Agent Rotation**: Ethical scraping practices
- **Error Handling**: Secure error messages without sensitive information exposure

### **API Security**
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Input Validation**: Comprehensive request validation using Joi
- **Error Sanitization**: Safe error responses without system information
- **Health Monitoring**: Continuous system health and performance tracking

## 📈 Performance Metrics

### **Typical Performance**
- **Search Response Time**: 2-15 seconds (depending on sources)
- **Properties per Search**: 500-1500 properties across all sources
- **Data Freshness**: Real-time scraping with <5 minute cache
- **Uptime**: 99.5%+ availability with Railway deployment

### **Scalability Features**
- **Horizontal Scaling**: Stateless architecture supports multiple instances
- **Database Optimization**: Indexed queries and efficient data structures
- **Caching Strategy**: Multi-tier caching reduces database load
- **Async Processing**: Non-blocking operations for better throughput

## 🐛 Troubleshooting

### **Common Issues**

**1. Scrapers Not Finding Properties**
```bash
# Test individual scrapers
npm run test:scrapers

# Check scraper logs
tail -f logs/scraping.log
```

**2. Database Connection Issues**
```bash
# Verify MongoDB connection
mongosh "mongodb://localhost:27017/ai-arriendo"

# Check environment variables
echo $MONGODB_URI
```

**3. Frontend Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules
npm run setup

# Check for TypeScript errors
cd client && npm run build
```

**4. Performance Issues**
- Enable Redis caching for better performance
- Reduce concurrent scraper limit in high-load scenarios
- Monitor memory usage during large searches

### **Debug Mode**
Enable detailed logging for troubleshooting:
```env
NODE_ENV=development
LOG_LEVEL=debug
SCRAPING_DEBUG=true
```

## 🔄 Updates & Maintenance

### **Regular Maintenance Tasks**
- **Scraper Updates**: Adapt to website changes and new selectors
- **Data Quality Monitoring**: Regular validation of extracted data
- **Performance Optimization**: Monitor and optimize slow queries
- **Security Updates**: Keep dependencies updated and secure

### **Monitoring & Alerts**
- **Health Checks**: Automated endpoint monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Metrics**: Response time and throughput monitoring
- **Data Quality Reports**: Regular scraper effectiveness analysis

---

<div align="center">
  <strong>Built with ❤️ for the Colombian rental market</strong>

  [🏠 Live Demo](https://your-railway-app.railway.app) • [📚 Documentation](https://github.com/gonbooster/AIArriendo/wiki) • [🐛 Report Bug](https://github.com/gonbooster/AIArriendo/issues) • [💡 Request Feature](https://github.com/gonbooster/AIArriendo/issues)
</div>
