/**
 * Rotador de User Agents para evitar detección
 */
export class UserAgentRotator {
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  private currentIndex: number = 0;

  /**
   * Obtiene el siguiente User Agent
   */
  getNext(): string {
    const userAgent = this.userAgents[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.userAgents.length;
    return userAgent;
  }

  /**
   * Obtiene un User Agent aleatorio
   */
  getRandom(): string {
    const randomIndex = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[randomIndex];
  }

  /**
   * Obtiene todos los User Agents disponibles
   */
  getAll(): string[] {
    return [...this.userAgents];
  }

  /**
   * Añade un nuevo User Agent
   */
  add(userAgent: string): void {
    if (!this.userAgents.includes(userAgent)) {
      this.userAgents.push(userAgent);
    }
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      totalUserAgents: this.userAgents.length,
      currentIndex: this.currentIndex
    };
  }
}
