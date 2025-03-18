import { createAPI } from '../src/miniapi.js';
import express from 'express';
import http from 'http';

console.log('Starting benchmark comparison...');

const miniApi = createAPI({ logging: false });
miniApi.get('/benchmark', (ctx) => {
  ctx.send({ message: 'Hello World!' });
});

const expressApp = express();
expressApp.get('/benchmark', (req, res) => {
  res.json({ message: 'Hello World!' });
});

async function runBenchmark(server, port, label) {
  const requestCount = 10000;
  const concurrency = 50; // Adjusted for testing
  const times = [];

  console.log(`Sending ${requestCount} requests to ${label} with concurrency ${concurrency}...`);
  const startTime = process.hrtime.bigint();

  async function makeRequest() {
    const reqStartTime = process.hrtime.bigint();
    return new Promise((resolve) => {
      http.get(`http://localhost:${port}/benchmark`, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          const duration = Number(process.hrtime.bigint() - reqStartTime) / 1000000;
          times.push(duration);
          resolve();
        });
      }).on('error', resolve);
    });
  }

  const requests = [];
  for (let i = 0; i < requestCount; i++) {
    requests.push(makeRequest());
    if (requests.length === concurrency || i === requestCount - 1) {
      await Promise.all(requests);
      requests.length = 0;
    }
  }

  const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
  const average = times.reduce((sum, time) => sum + time, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const rps = requestCount / (totalTime / 1000);

  console.log(`\n--- ${label} Benchmark Results ---`);
  console.log(`Total requests: ${requestCount}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Total time: ${totalTime.toFixed(2)} ms`);
  console.log(`Requests per second: ${rps.toFixed(2)}`);
  console.log(`Average response time: ${average.toFixed(2)} ms`);
  console.log(`Min response time: ${min.toFixed(2)} ms`);
  console.log(`Max response time: ${max.toFixed(2)} ms`);

  return { rps, totalTime, average, min, max };
}

async function runComparison() {
  const miniServer = await miniApi.listen(3001);
  console.log('MiniAPI server running on http://localhost:3001');

  const expressServer = expressApp.listen(3002);
  console.log('Express server running on http://localhost:3002');

  const miniResults = await runBenchmark(miniServer, 3001, 'MiniAPI');
  const expressResults = await runBenchmark(expressServer, 3002, 'Express');

  console.log('\n--- Performance Comparison ---');
  console.log(`MiniAPI RPS: ${miniResults.rps.toFixed(2)}`);
  console.log(`Express RPS: ${expressResults.rps.toFixed(2)}`);
  console.log(`MiniAPI is ${(miniResults.rps / expressResults.rps).toFixed(2)}x faster than Express`);

  miniServer.close(() => console.log('MiniAPI server closed'));
  expressServer.close(() => console.log('Express server closed'));
}

runComparison().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});