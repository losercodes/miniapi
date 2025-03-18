// miniapi.js - The Smallest API Framework (1KB)
// Zero dependencies, pure Node.js HTTP module

export class MiniAPI {
    constructor(options = {}) {
      this.routes = {};
      this.middlewares = [];
      this.errorHandlers = [];
      this.options = {
        cors: options.cors || false,
        logging: options.logging || false,
        compression: options.compression || false,
        rateLimit: options.rateLimit || false,
        rateWindow: options.rateWindow || 60000, // 1 minute
        rateMax: options.rateMax || 100 // 100 requests per minute
      };
      this.rateLimitStore = new Map();
    }
  
    // Register route handlers for different HTTP methods
    get(path, handler) {
      this._addRoute('GET', path, handler);
      return this;
    }
  
    post(path, handler) {
      this._addRoute('POST', path, handler);
      return this;
    }
  
    put(path, handler) {
      this._addRoute('PUT', path, handler);
      return this;
    }
  
    delete(path, handler) {
      this._addRoute('DELETE', path, handler);
      return this;
    }
  
    patch(path, handler) {
      this._addRoute('PATCH', path, handler);
      return this;
    }
  
    // Add middleware function
    use(middleware) {
      this.middlewares.push(middleware);
      return this;
    }
  
    // Add error handler
    onError(handler) {
      this.errorHandlers.push(handler);
      return this;
    }
  
    // Group routes with prefix
    group(prefix, callback) {
      const originalRoutes = this.routes;
      this.routes = {};
      
      callback(this);
      
      const groupRoutes = this.routes;
      this.routes = originalRoutes;
      
      // Add prefix to all routes in the group
      Object.keys(groupRoutes).forEach(key => {
        const [method, path] = key.split(':');
        const prefixedPath = prefix + path;
        this._addRoute(method, prefixedPath, groupRoutes[key]);
      });
      
      return this;
    }
  
    // Private method to add routes
    _addRoute(method, path, handler) {
      const routeKey = `${method}:${path}`;
      this.routes[routeKey] = handler;
    }
  
    // Extract URL parameters from path
    _extractParams(routePath, requestPath) {
      // Handle wildcard routes
      if (routePath.endsWith('/*')) {
        const basePath = routePath.slice(0, -2);
        if (requestPath.startsWith(basePath)) {
          return { wildcard: requestPath.slice(basePath.length) };
        }
        return null;
      }
  
      const routeParts = routePath.split('/');
      const requestParts = requestPath.split('/');
      const params = {};
  
      if (routeParts.length !== requestParts.length) return null;
  
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          const paramName = routeParts[i].substring(1);
          params[paramName] = requestParts[i];
        } else if (routeParts[i] !== requestParts[i]) {
          return null;
        }
      }
  
      return params;
    }
  
    // Find matching route
    _findRoute(method, url) {
      const urlObj = new URL(url, 'http://localhost');
      const path = urlObj.pathname;
      
      // First try exact match
      const exactRouteKey = `${method}:${path}`;
      if (this.routes[exactRouteKey]) {
        return {
          handler: this.routes[exactRouteKey],
          params: {},
          query: Object.fromEntries(urlObj.searchParams)
        };
      }
  
      // Try parameter routes
      for (const routeKey of Object.keys(this.routes)) {
        const [routeMethod, routePath] = routeKey.split(':');
        if (routeMethod === method) {
          const params = this._extractParams(routePath, path);
          if (params) {
            return {
              handler: this.routes[routeKey],
              params,
              query: Object.fromEntries(urlObj.searchParams)
            };
          }
        }
      }
  
      return null;
    }
  
    // Simple compression (for text/json responses)
    async _compress(data, req) {
      if (!this.options.compression) return data;
      
      const zlib = await import('zlib');
      const acceptEncoding = req.headers['accept-encoding'] || '';
      
      if (acceptEncoding.includes('gzip')) {
        return zlib.gzipSync(data);
      } else if (acceptEncoding.includes('deflate')) {
        return zlib.deflateSync(data);
      }
      
      return data;
    }
  
    // Rate limiting
    _checkRateLimit(req) {
      if (!this.options.rateLimit) return true;
      
      const ip = req.socket.remoteAddress || '127.0.0.1';
      const now = Date.now();
      
      if (!this.rateLimitStore.has(ip)) {
        this.rateLimitStore.set(ip, {
          count: 1,
          resetAt: now + this.options.rateWindow
        });
        return true;
      }
      
      const record = this.rateLimitStore.get(ip);
      
      if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + this.options.rateWindow;
        return true;
      }
      
      if (record.count >= this.options.rateMax) {
        return false;
      }
      
      record.count++;
      return true;
    }
  
    // Parse JSON request body
    async _parseBody(req) {
      return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const contentType = req.headers['content-type'];
            if (contentType && contentType.includes('application/json') && body) {
              resolve(JSON.parse(body));
            } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
              // Parse form data
              const formData = {};
              body.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                formData[decodeURIComponent(key)] = decodeURIComponent(value);
              });
              resolve(formData);
            } else {
              resolve(body || null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      });
    }
  
    // Start the server
    async  listen(port = 3000, callback) {
      const http = await import('http');
      
      const server = http.createServer(async (req, res) => {
        // Add CORS headers if enabled
        if (this.options.cors) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
          
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }
        }
  
        // Check rate limit
        if (!this._checkRateLimit(req)) {
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Too many requests' }));
          return;
        }
  
        // Create context object
        const ctx = {
          req,
          res,
          params: {},
          query: {},
          body: null,
          send: async (data, statusCode = 200) => {
            res.statusCode = statusCode;
            
            // Set JSON content type
            res.setHeader('Content-Type', 'application/json');
            
            // Convert to JSON string
            const jsonString = JSON.stringify(data);
            
            if (this.options.compression) {
              const compressed = await this._compress(jsonString, req);
              if (compressed !== jsonString) {
                const encoding = req.headers['accept-encoding'] || '';
                if (encoding.includes('gzip')) {
                  res.setHeader('Content-Encoding', 'gzip');
                } else if (encoding.includes('deflate')) {
                  res.setHeader('Content-Encoding', 'deflate');
                }
              }
              res.end(compressed);
            } else {
              res.end(jsonString);
            }
          },
          text: async (data, statusCode = 200) => {
            res.statusCode = statusCode;
            res.setHeader('Content-Type', 'text/plain');
            
            if (this.options.compression) {
              const compressed = await this._compress(data, req);
              if (compressed !== data) {
                const encoding = req.headers['accept-encoding'] || '';
                if (encoding.includes('gzip')) {
                  res.setHeader('Content-Encoding', 'gzip');
                } else if (encoding.includes('deflate')) {
                  res.setHeader('Content-Encoding', 'deflate');
                }
              }
              res.end(compressed);
            } else {
              res.end(data);
            }
          },
          html: async (data, statusCode = 200) => {
            res.statusCode = statusCode;
            res.setHeader('Content-Type', 'text/html');
            
            if (this.options.compression) {
              const compressed = await this._compress(data, req);
              if (compressed !== data) {
                const encoding = req.headers['accept-encoding'] || '';
                if (encoding.includes('gzip')) {
                  res.setHeader('Content-Encoding', 'gzip');
                } else if (encoding.includes('deflate')) {
                  res.setHeader('Content-Encoding', 'deflate');
                }
              }
              res.end(compressed);
            } else {
              res.end(data);
            }
          },
          redirect: (url, statusCode = 302) => {
            res.statusCode = statusCode;
            res.setHeader('Location', url);
            res.end();
          }
        };
  
        try {
          // Parse request body
          ctx.body = await this._parseBody(req);
          
          // Log request if logging is enabled
          if (this.options.logging) {
            console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
          }
  
          // Run middlewares
          for (const middleware of this.middlewares) {
            const result = await middleware(ctx);
            if (result === false) return; // Middleware aborted the request
          }
  
          // Find route handler
          const route = this._findRoute(req.method, req.url);
          
          if (route) {
            ctx.params = route.params;
            ctx.query = route.query;
            await route.handler(ctx);
          } else {
            // Route not found
            ctx.send({ error: 'Not found' }, 404);
          }
        } catch (error) {
          // Handle errors
          let handled = false;
          
          for (const errorHandler of this.errorHandlers) {
            if (await errorHandler(error, ctx)) {
              handled = true;
              break;
            }
          }
          
          if (!handled) {
            console.error(error);
            ctx.send({ error: 'Internal server error' }, 500);
          }
        }
      });
  
      server.listen(port, () => {
        if (callback) callback(server);
        if (this.options.logging) {
          console.log(`🚀 MiniAPI server running on http://localhost:${port}`);
        }
      });
  
      return server;
    }
  }
  
  // Helper to create MiniAPI instance
  export function createAPI(options) {
    return new MiniAPI(options);
  }