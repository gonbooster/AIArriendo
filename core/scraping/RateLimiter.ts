import { RateLimit } from '../types';
import { logger } from '../../utils/logger';

/**
 * Rate limiter para controlar la frecuencia de requests
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly requestsPerMinute: number;
  private readonly delayBetweenRequests: number;
  private readonly maxConcurrentRequests: number;
  private activeRequests: number = 0;

  constructor(rateLimit: RateLimit) {
    this.requestsPerMinute = rateLimit.requestsPerMinute;
    this.delayBetweenRequests = rateLimit.delayBetweenRequests;
    this.maxConcurrentRequests = rateLimit.maxConcurrentRequests;
  }

  /**
   * Espera hasta que se pueda hacer una request
   */
  async waitForSlot(): Promise<void> {
    // Esperar si hay demasiadas requests concurrentes
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await this.delay(100);
    }

    // Limpiar requests antiguas (más de 1 minuto)
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < 60000);

    // Esperar si se ha alcanzado el límite por minuto
    while (this.requests.length >= this.requestsPerMinute) {
      await this.delay(1000);
      const currentTime = Date.now();
      this.requests = this.requests.filter(time => currentTime - time < 60000);
    }

    // Aplicar delay entre requests
    if (this.requests.length > 0) {
      const timeSinceLastRequest = now - this.requests[this.requests.length - 1];
      if (timeSinceLastRequest < this.delayBetweenRequests) {
        await this.delay(this.delayBetweenRequests - timeSinceLastRequest);
      }
    }

    // Registrar la nueva request
    this.requests.push(Date.now());
    this.activeRequests++;

    // Programar la liberación del slot
    setTimeout(() => {
      this.activeRequests--;
    }, this.delayBetweenRequests);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene estadísticas del rate limiter
   */
  getStats() {
    return {
      requestsInLastMinute: this.requests.length,
      activeRequests: this.activeRequests,
      requestsPerMinute: this.requestsPerMinute,
      delayBetweenRequests: this.delayBetweenRequests,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }
}
