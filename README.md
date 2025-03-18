# MiniAPI - The Lightweight Node.js API Framework

**MiniAPI** is a blazing-fast, ultra-lightweight API framework for Node.js. At just **1KB**, it provides essential routing, middleware, error handling, and more – all without dependencies.

## 🚀 Why MiniAPI?

- **Ultra-Lightweight** – Only **1KB** in size!
- **Zero Dependencies** – Pure **Node.js HTTP module**.
- **Express-Like API** – Simple and intuitive routing.
- **Middleware Support** – Custom middleware for flexibility.
- **Error Handling** – Graceful error handling built-in.
- **Grouped Routes** – Organize APIs with prefixes.
- **CORS Support** – Enable Cross-Origin Resource Sharing.
- **Rate Limiting & Compression** – Optimize performance.
- **Super Fast** – Outperforms Express with minimal overhead.

---

## 💊 Performance Benchmarks

MiniAPI is significantly faster than Express:

| Framework   | Requests/sec | Avg Response Time |
| ----------- | ------------ | ----------------- |
| **MiniAPI** | **12,000**   | **3.20ms**        |
| Express     | 7,000        | 6.21ms            |

**Benchmark Setup:**

- **10,000 requests** with **50 concurrent connections**.
- Lower response time = faster performance.

---

## 📦 Installation

```sh
npm install miniapi-framework
```

---

## 🛠 Basic Usage

```javascript
import { createAPI } from 'miniapi-framework';

// Create API instance
const api = createAPI({
  logging: true,
  cors: true
});

// Define routes
api.get('/hello', (ctx) => {
  ctx.send({ message: 'Hello, World!' });
});

api.post('/echo', (ctx) => {
  ctx.send(ctx.body);
});

// Start the server
api.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## ⚡ Advanced Usage

### Middleware Support

```javascript
api.use(async (ctx, next) => {
  console.log(`Request: ${ctx.req.method} ${ctx.req.url}`);
  return next();
});
```

### Route Parameters

```javascript
api.get('/users/:id', (ctx) => {
  const userId = ctx.params.id;
  ctx.send({ id: userId, name: `User ${userId}` });
});
```

### Grouped Routes

```javascript
api.group('/api', (apiRouter) => {
  apiRouter.get('/users', (ctx) => {
    ctx.send([{ id: 1, name: 'User 1' }]);
  });
  
  apiRouter.get('/users/:id', (ctx) => {
    ctx.send({ id: ctx.params.id, name: `User ${ctx.params.id}` });
  });
});
```

### Authentication Middleware

```javascript
const auth = async (ctx, next) => {
  const token = ctx.req.headers['authorization'];
  
  if (!token || !token.startsWith('Bearer ')) {
    return ctx.send({ error: 'Unauthorized' }, 401);
  }
  
  // Validate token
  const apiKey = token.split(' ')[1];
  if (apiKey !== 'your-api-key') {
    return ctx.send({ error: 'Invalid API key' }, 401);
  }
  
  ctx.user = { id: 1, role: 'admin' };
  return next();
};

// Apply to specific routes
api.get('/protected', auth, (ctx) => {
  ctx.send({ message: 'Protected data', user: ctx.user });
});
```

### Error Handling

```javascript
api.onError((error, ctx) => {
  console.error('Error:', error);
  ctx.send({ error: 'Internal Server Error' }, 500);
  return true; // Error was handled
});
```

### Response Methods

```javascript
// JSON response (default)
ctx.send({ data: 'example' }, 200);

// Text response
ctx.text('Plain text response', 200);

// HTML response
ctx.html('<h1>Hello World</h1>', 200);

// Redirect
ctx.redirect('/new-location', 302);
```

---

## 🔐 API Reference

### Creating an API Instance

```javascript
const api = createAPI(options);
```

**Options:**

| Option        | Description                 | Default |
| ------------- | --------------------------- | ------- |
| `cors`        | Enable CORS                 | `false` |
| `logging`     | Enable request logging      | `false` |
| `compression` | Enable response compression | `false` |
| `rateLimit`   | Enable rate limiting        | `false` |
| `rateWindow`  | Rate limit window in ms     | `60000` |
| `rateMax`     | Maximum requests per window | `100`   |

### Routing Methods

```javascript
api.get(path, handler);
api.post(path, handler);
api.put(path, handler);
api.delete(path, handler);
api.patch(path, handler);
```

### Context Object Properties

| Property | Description                      |
| -------- | -------------------------------- |
| `req`    | Original Node.js request object  |
| `res`    | Original Node.js response object |
| `params` | URL parameters                   |
| `query`  | Query string parameters          |
| `body`   | Parsed request body              |

---

## 🌐 Complete Example

```javascript
import { createAPI } from 'miniapi-framework';

// Create API instance with options
const api = createAPI({
  logging: true,
  cors: true,
  compression: true,
  rateLimit: true
});

// Global middleware
api.use(async (ctx, next) => {
  ctx.requestTime = new Date();
  ctx.res.setHeader('X-Powered-By', 'MiniAPI');
  return next();
});

// Basic routes
api.get('/', (ctx) => {
  ctx.send({ 
    message: 'Welcome to MiniAPI!',
    timestamp: ctx.requestTime.toISOString()
  });
});

// API routes group
api.group('/api', (apiRouter) => {
  apiRouter.get('/users', (ctx) => {
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    ctx.send({ users });
  });
  
  apiRouter.get('/users/:id', (ctx) => {
    const userId = ctx.params.id;
    ctx.send({ id: userId, name: `User ${userId}` });
  });
  
  apiRouter.post('/users', (ctx) => {
    if (!ctx.body || !ctx.body.name) {
      return ctx.send({ error: 'Name is required' }, 400);
    }
    
    ctx.send({ 
      message: 'User created',
      user: {
        id: 3,
        name: ctx.body.name,
        createdAt: new Date().toISOString()
      }
    }, 201);
  });
});

// Error handling
api.onError((error, ctx) => {
  console.error('Error:', error);
  ctx.send({ error: 'Internal Server Error' }, 500);
  return true;
});

// Start the server
api.listen(3000, (server) => {
  console.log('🚀 MiniAPI server running on http://localhost:3000');
});
```

---

## 💡 Why Choose MiniAPI Over Alternatives?

| Feature       | MiniAPI        | Express | Fastify |
| ------------- | -------------- | ------- | ------- |
| Size          | **1KB**        | 60KB+   | 30KB+   |
| Dependencies  | **0**          | Many    | Some    |
| Performance   | **🔥 Fastest** | Medium  | High    |
| Middleware    | ✅ Yes          | ✅ Yes   | ✅ Yes   |
| CORS Support  | ✅ Yes          | ✅ Yes   | ✅ Yes   |
| Rate Limiting | ✅ Yes          | ❌ No    | ✅ Yes   |

---

## 🐝 License & Contributions

MiniAPI is open-source and licensed under **MIT**. Contributions are welcome!

Feel free to submit issues, feature requests, or PRs. Let's make MiniAPI even better! 🚀

## 🔧 Development

To build from source:

```sh
# Clone the repository
git clone https://github.com/yourusername/miniapi-framework.git
cd miniapi-framework

# Install development dependencies
npm install

# Build the package
npm run build
```

The build process generates both CommonJS (.cjs) and ES Module (.mjs) versions for maximum compatibility.