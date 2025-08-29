#!/usr/bin/env node

// Polyfill for File API in Node.js environments
if (typeof globalThis.File === 'undefined') {
  // Simple File polyfill for server environments
  globalThis.File = class File {
    constructor(fileBits, fileName, options = {}) {
      this.name = fileName;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = 0;
      
      if (Array.isArray(fileBits)) {
        this.size = fileBits.reduce((total, bit) => {
          if (typeof bit === 'string') return total + bit.length;
          if (bit instanceof ArrayBuffer) return total + bit.byteLength;
          return total;
        }, 0);
      }
    }
  };
}

// Polyfill for FormData if needed
if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
    
    append(name, value, filename) {
      if (!this._data.has(name)) {
        this._data.set(name, []);
      }
      this._data.get(name).push({ value, filename });
    }
    
    get(name) {
      const values = this._data.get(name);
      return values ? values[0].value : null;
    }
    
    getAll(name) {
      const values = this._data.get(name);
      return values ? values.map(v => v.value) : [];
    }
    
    has(name) {
      return this._data.has(name);
    }
    
    delete(name) {
      this._data.delete(name);
    }
    
    set(name, value, filename) {
      this._data.set(name, [{ value, filename }]);
    }
    
    entries() {
      const entries = [];
      for (const [name, values] of this._data) {
        for (const { value } of values) {
          entries.push([name, value]);
        }
      }
      return entries[Symbol.iterator]();
    }
    
    keys() {
      return this._data.keys();
    }
    
    values() {
      const values = [];
      for (const [, valueArray] of this._data) {
        for (const { value } of valueArray) {
          values.push(value);
        }
      }
      return values[Symbol.iterator]();
    }
    
    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

console.log('🔧 Polyfills applied for Node.js compatibility');
console.log('🚀 Starting AI Arriendo Pro Server...');

// Start the actual server
require('./dist/server.js');
