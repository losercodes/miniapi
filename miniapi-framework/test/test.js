import { createAPI } from '../src/miniapi.js';
import http from 'http';
import assert from 'assert';

console.log('Running MiniAPI tests...');

// Create API instance
const api = createAPI({ logging: true });

// Add a test route
api.get('/test', (ctx) => {
  ctx.send({ success: true, message: 'MiniAPI is working!' });
});

// Start the server with async handling
(async () => {
  try {
    const server = await api.listen(3333);
    console.log('Test server running on http://localhost:3333');

    // Make a test request
    http.get('http://localhost:3333/test', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Test response:', response);

          // Assertions
          assert.strictEqual(response.success, true, 'Response success should be true');
          assert.strictEqual(response.message, 'MiniAPI is working!', 'Response message should match');

          console.log('✅ Test passed!');
        } catch (error) {
          console.error('❌ Test failed!', error);
          process.exit(1);
        } finally {
          // Close the server after test completion
          server.close(() => {
            console.log('Test server closed');
          });
        }
      });
    }).on('error', (err) => {
      console.error('Test request error:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
})();
