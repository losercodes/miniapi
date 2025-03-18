// advanced-example.js - How to use MiniAPI's viral features

import { createAPI } from '../src/miniapi';
import { readFileSync } from 'fs';
import { join } from 'path';

// Create API instance with all the viral features enabled
const api = createAPI({ 
  logging: true,
  cors: true,
  compression: true,
  rateLimit: true,
  rateMax: 100,    // 100 requests per minute
  rateWindow: 60000 // 1 minute window
});

// ===== MIDDLEWARE SETUP =====

// Request timing middleware
api.use(async (ctx) => {
  ctx.startTime = Date.now();
  
  // Continue to the next middleware or route handler
  ctx.res.on('finish', () => {
    const duration = Date.now() - ctx.startTime;
    console.log(`⏱️ ${ctx.req.method} ${ctx.req.url} - ${duration}ms`);
  });
});

// Request ID middleware
api.use((ctx) => {
  const requestId = crypto.randomUUID();
  ctx.requestId = requestId;
  ctx.res.setHeader('X-Request-ID', requestId);
});

// Authentication middleware
api.use((ctx) => {
  const authHeader = ctx.req.headers['authorization'];
  
  // Skip auth for public routes
  if (ctx.req.url.startsWith('/public')) {
    return true;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.send({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
    return false;
  }
  
  const token = authHeader.split(' ')[1];
  
  // In a real app, you would verify the token
  // For this example, we'll just check if it's our demo token
  if (token !== 'demo-token') {
    ctx.send({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401);
    return false;
  }
  
  // Add user info to context
  ctx.user = { id: '123', name: 'Demo User' };
  return true;
});

// ===== ERROR HANDLING =====

// Error handler for validation errors
api.onError((error, ctx) => {
  if (error.name === 'ValidationError') {
    ctx.send({
      error: 'Validation failed',
      details: error.details
    }, 400);
    return true;
  }
  return false;
});

// Global error handler
api.onError((error, ctx) => {
  console.error(`Error [${ctx.requestId}]:`, error);
  ctx.send({
    error: 'Internal server error',
    requestId: ctx.requestId
  }, 500);
  return true;
});

// ===== PUBLIC ROUTES =====

// Group public routes
api.group('/public', (publicApi) => {
  publicApi.get('/status', (ctx) => {
    ctx.send({ 
      status: 'OK',
      version: '1.0.0',
      uptime: process.uptime()
    });
  });
  
  publicApi.get('/docs', (ctx) => {
    ctx.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MiniAPI Docs</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>MiniAPI Documentation</h1>
          <p>Welcome to the MiniAPI documentation. Here's a quick example:</p>
          <pre>
import { createAPI } from './miniapi.js';

const api = createAPI();
api.get('/hello', (ctx) => {
  ctx.send({ message: 'Hello World!' });
});

api.listen(3000);
          </pre>
        </body>
      </html>
    `);
  });
});

// ===== API ROUTES =====

// Group user routes
api.group('/api/users', (userApi) => {
  // Get all users
  userApi.get('', (ctx) => {
    // Simulate database query
    const users = [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' }
    ];
    
    ctx.send({ users });
  });
  
  // Get user by ID
  userApi.get('/:id', (ctx) => {
    const { id } = ctx.params;
    
    // Simulate database query
    const user = { id, name: 'Example User', email: 'user@example.com' };
    
    ctx.send({ user });
  });
  
  // Create user
  userApi.post('', (ctx) => {
    const { name, email } = ctx.body;
    
    // Validate input
    if (!name || !email) {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.details = { 
        fields: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null
        }
      };
      throw error;
    }
    
    // Simulate database insert
    const user = { 
      id: crypto.randomUUID(),
      name,
      email,
      created: new Date()
    };
    
    ctx.send({ user }, 201);
  });
  
  // Update user
  userApi.put('/:id', (ctx) => {
    const { id } = ctx.params;
    const { name, email } = ctx.body;
    
    // Simulate database update
    const user = { 
      id,
      name: name || 'Default Name',
      email: email || 'default@example.com',
      updated: new Date()
    };
    
    ctx.send({ user });
  });
  
  // Delete user
  userApi.delete('/:id', (ctx) => {
    const { id } = ctx.params;
    
    ctx.send({ 
      success: true,
      message: `User ${id} deleted`
    });
  });
});

// ===== FILE HANDLING =====

// Serve static files
api.get('/static/*', (ctx) => {
  try {
    const filePath = join('public', ctx.params.wildcard);
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.json': 'application/json'
    }[filePath.substring(filePath.lastIndexOf('.'))];
    
    const content = readFileSync(filePath);
    
    ctx.res.setHeader('Content-Type', contentType);
    ctx.res.end(content);
  } catch (error) {
    ctx.send({ error: 'File not found' }, 404);
  }
});

// ===== WEBSOCKET SUPPORT =====

api.listen(3000, (server) => {
  console.log('🚀 MiniAPI server started on http://localhost:3000');
  
  // You could add WebSocket support here
  // Using the native 'ws' package (would need to be installed)
  // const WebSocketServer = require('ws').Server;
  // const wss = new WebSocketServer({ server });
  // wss.on('connection', ws => {
  //   ws.on('message', message => {
  //     console.log('received: %s', message);
  //     ws.send(`Echo: ${message}`);
  //   });
  // });
});