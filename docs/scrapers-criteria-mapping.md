# Scrapers: criterios soportados y mapeo

Resumen de cómo convertimos los filtros del frontend en URLs para cada fuente. Sirve de referencia para ajustar o diagnosticar por qué no se respetan rooms/baños/área, etc.

- Fincaraiz
  - URL base: https://www.fincaraiz.com.co/arriendo/apartamento/bogota
  - Parámetros usados:
    - ad_type=2 (arriendo)
    - property_type=1 (apartamento)
    - city=11001 (Bogotá)
    - min_rooms, max_rooms
    - min_area, max_area
    - max_price (COP)
    - currency=COP
  - Notas: soporta rangos de rooms y área.

- Metrocuadrado
  - URL base: https://www.metrocuadrado.com/apartamentos/arriendo/bogota/
  - Parámetros usados:
    - habitaciones=min-max
    - area=min-max
    - precio=0-max
    - orden=relevancia
  - Notas: el HTML de las cards a veces no expone rooms/área; extraemos con headless y regex donde sea posible.

- MercadoLibre
  - URL base: https://inmuebles.mercadolibre.com.co/apartamentos/arriendo/bogota/
  - Parámetros usados: no ofrece filtros finos en URL para rooms/área/baños.
  - Notas: extraemos rooms/área de título/texto del card (regex). Se ignoran listados de "Habitación".

- Ciencuadras
  - URL base: https://www.ciencuadras.com/arriendo/apartamento/bogota
  - Parámetros usados: la URL base ya aplica ciudad y tipo; filtros avanzados requieren navegación/JS (no incluidos por URL).

Cómo agregar nuevas fuentes o parámetros: editar config/scraping-sources.ts (URL_BUILDERS) y, si hace falta, el scraper específico para extraer campos desde el HTML.


- Properati
  - URL base: https://www.properati.com.co/bogota/arriendo/apartamento
  - Parámetros usados (URL): limitados en listing; filtros finos requieren JS. Post-filtro por precio/rooms/área se hace en backend.

- Trovit
  - URL base: https://casas.trovit.com.co/arriendo-apartamento-bogota
  - Parámetros usados: what (query), where (ciudad), min_rooms, min_size, max_price. Puede variar la estructura; el scraper es defensivo.

- PADS
  - URL base: https://www.pads.com
  - Parámetros usados: la URL base filtra ciudad/tipo con navegación; se filtra por backend los rangos.

Entrada estándar desde el frontend (resumen)
- operation: arriendo/venta (mapeado a cada portal cuando aplica)
- propertyTypes: ['Apartamento'] (algunos portales usan IDs propios; se aproxima en URL o se filtra post-scrape)
- minRooms/maxRooms, minBathrooms/maxBathrooms: portales con soporte via URL (Fincaraiz, Metrocuadrado, Trovit); otros se filtran post-scrape.
- minArea/maxArea: idem.
- minPrice/maxPrice: casi todos soportan límite superior; el inferior se filtra post-scrape si no existe.
- location.city/neighborhoods: las URLs usan Bogotá; barrios se filtran post-scrape comparando address/neighborhood.

Salida estándar (Property)
- id, title, price, adminFee, totalPrice, area, rooms, bathrooms, location { address, neighborhood, city }, images[], url, source, pricePerM2, description, isActive

Notas
- En MercadoLibre y Ciencuadras las cards no publican siempre rooms/baños/área; se intenta regex en texto para rellenar. Si no aparecen, quedan 0 (la UI muestra N/A).
- Duplicados: se eliminan por URL canónica o (título+precio) antes de puntuar.
