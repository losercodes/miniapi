var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/miniapi.js
var miniapi_exports = {};
__export(miniapi_exports, {
  MiniAPI: () => MiniAPI,
  createAPI: () => createAPI,
  default: () => miniapi_default
});
module.exports = __toCommonJS(miniapi_exports);
var MiniAPI = class {
  constructor(options = {}) {
    this.routes = {};
    this.middlewares = [];
    this.errorHandlers = [];
    this.options = {
      cors: options.cors || false,
      logging: options.logging || false,
      compression: options.compression || false,
      rateLimit: options.rateLimit || false,
      rateWindow: options.rateWindow || 6e4,
      // 1 minute
      rateMax: options.rateMax || 100
      // 100 requests per minute
    };
    this.rateLimitStore = /* @__PURE__ */ new Map();
    if (this.options.logging) {
      this.use(async (ctx, next) => {
        const start = Date.now();
        console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] \u2192 ${ctx.req.method} ${ctx.req.url}`);
        const originalEnd = ctx.res.end;
        ctx.res.end = function(...args) {
          const duration = Date.now() - start;
          console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] \u2190 ${ctx.req.method} ${ctx.req.url} (${ctx.res.statusCode}) - ${duration}ms`);
          return originalEnd.apply(this, args);
        };
        return next();
      });
    }
  }
  // Register route handlers for different HTTP methods
  get(path, handler) {
    this._addRoute("GET", path, handler);
    return this;
  }
  post(path, handler) {
    this._addRoute("POST", path, handler);
    return this;
  }
  put(path, handler) {
    this._addRoute("PUT", path, handler);
    return this;
  }
  delete(path, handler) {
    this._addRoute("DELETE", path, handler);
    return this;
  }
  patch(path, handler) {
    this._addRoute("PATCH", path, handler);
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
    Object.keys(groupRoutes).forEach((key) => {
      const [method, path] = key.split(":");
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
    if (routePath.endsWith("/*")) {
      const basePath = routePath.slice(0, -2);
      if (requestPath.startsWith(basePath)) {
        return { wildcard: requestPath.slice(basePath.length) };
      }
      return null;
    }
    const routeParts = routePath.split("/");
    const requestParts = requestPath.split("/");
    const params = {};
    if (routeParts.length !== requestParts.length)
      return null;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) {
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
    const urlObj = new URL(url, "http://localhost");
    const path = urlObj.pathname;
    const exactRouteKey = `${method}:${path}`;
    if (this.routes[exactRouteKey]) {
      return {
        handler: this.routes[exactRouteKey],
        params: {},
        query: Object.fromEntries(urlObj.searchParams)
      };
    }
    for (const routeKey of Object.keys(this.routes)) {
      const [routeMethod, routePath] = routeKey.split(":");
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
    if (!this.options.compression)
      return data;
    const zlib = await import("zlib");
    const acceptEncoding = req.headers["accept-encoding"] || "";
    if (acceptEncoding.includes("gzip")) {
      return zlib.gzipSync(data);
    } else if (acceptEncoding.includes("deflate")) {
      return zlib.deflateSync(data);
    }
    return data;
  }
  // Rate limiting
  _checkRateLimit(req) {
    if (!this.options.rateLimit)
      return true;
    const ip = req.socket.remoteAddress || "127.0.0.1";
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
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const contentType = req.headers["content-type"];
          if (contentType && contentType.includes("application/json") && body) {
            resolve(JSON.parse(body));
          } else if (contentType && contentType.includes("application/x-www-form-urlencoded")) {
            const formData = {};
            body.split("&").forEach((pair) => {
              const [key, value] = pair.split("=");
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
  // Execute middleware chain
  async _executeMiddlewares(ctx) {
    let index = 0;
    const next = async () => {
      if (index >= this.middlewares.length) {
        return true;
      }
      const middleware = this.middlewares[index++];
      const result = await middleware(ctx, next);
      if (result === false) {
        return false;
      }
      return true;
    };
    return next();
  }
  // Start the server
  async listen(port = 3e3, callback) {
    const http = await import("http");
    if (!this.routes["GET:/"]) {
      this.get("/", (ctx) => {
        ctx.send({ message: "Welcome to MiniAPI Framework!" });
      });
    }
    const server = http.createServer(async (req, res) => {
      if (this.options.cors) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
      }
      if (!this._checkRateLimit(req)) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Too many requests" }));
        return;
      }
      const ctx = {
        req,
        res,
        params: {},
        query: {},
        body: null,
        send: async (data, statusCode = 200) => {
          res.statusCode = statusCode;
          res.setHeader("Content-Type", "application/json");
          const jsonString = JSON.stringify(data);
          if (this.options.compression) {
            const compressed = await this._compress(jsonString, req);
            if (compressed !== jsonString) {
              const encoding = req.headers["accept-encoding"] || "";
              if (encoding.includes("gzip")) {
                res.setHeader("Content-Encoding", "gzip");
              } else if (encoding.includes("deflate")) {
                res.setHeader("Content-Encoding", "deflate");
              }
            }
            res.end(compressed);
          } else {
            res.end(jsonString);
          }
        },
        text: async (data, statusCode = 200) => {
          res.statusCode = statusCode;
          res.setHeader("Content-Type", "text/plain");
          if (this.options.compression) {
            const compressed = await this._compress(data, req);
            if (compressed !== data) {
              const encoding = req.headers["accept-encoding"] || "";
              if (encoding.includes("gzip")) {
                res.setHeader("Content-Encoding", "gzip");
              } else if (encoding.includes("deflate")) {
                res.setHeader("Content-Encoding", "deflate");
              }
            }
            res.end(compressed);
          } else {
            res.end(data);
          }
        },
        html: async (data, statusCode = 200) => {
          res.statusCode = statusCode;
          res.setHeader("Content-Type", "text/html");
          if (this.options.compression) {
            const compressed = await this._compress(data, req);
            if (compressed !== data) {
              const encoding = req.headers["accept-encoding"] || "";
              if (encoding.includes("gzip")) {
                res.setHeader("Content-Encoding", "gzip");
              } else if (encoding.includes("deflate")) {
                res.setHeader("Content-Encoding", "deflate");
              }
            }
            res.end(compressed);
          } else {
            res.end(data);
          }
        },
        redirect: (url, statusCode = 302) => {
          res.statusCode = statusCode;
          res.setHeader("Location", url);
          res.end();
        }
      };
      try {
        ctx.body = await this._parseBody(req);
        const shouldContinue = await this._executeMiddlewares(ctx);
        if (shouldContinue === false) {
          return;
        }
        const route = this._findRoute(req.method, req.url);
        if (route) {
          ctx.params = route.params;
          ctx.query = route.query;
          await route.handler(ctx);
        } else {
          ctx.send({
            error: "Not found",
            path: req.url,
            method: req.method,
            message: `No route found for ${req.method} ${req.url}`
          }, 404);
        }
      } catch (error) {
        let handled = false;
        for (const errorHandler of this.errorHandlers) {
          if (await errorHandler(error, ctx)) {
            handled = true;
            break;
          }
        }
        if (!handled) {
          console.error(error);
          ctx.send({
            error: "Internal server error",
            message: error.message,
            path: req.url
          }, 500);
        }
      }
    });
    server.listen(port, () => {
      if (callback)
        callback(server);
      if (this.options.logging) {
        console.log(`\u{1F680} MiniAPI server running on http://localhost:${port}`);
      }
    });
    return server;
  }
};
function createAPI(options) {
  return new MiniAPI(options);
}
var miniapi_default = createAPI;
if (typeof globalThis.__miniapi_commonjs__ !== "undefined") {
  globalThis.__miniapi_commonjs__.exports = {
    MiniAPI,
    createAPI,
    default: createAPI
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MiniAPI,
  createAPI
});
