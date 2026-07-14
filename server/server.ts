import express from 'express';
import cors from 'cors';
import mockPatients from './mock-data';

const app = express();
app.use(cors());

/**
 * Serves mock patient data directly instead of proxying to an upstream API.
 * This enables fully offline development with realistic, deterministic data.
 */
app.get('/api/dashboard', (_req, res) => {
  // Simulate realistic network latency (200-400ms)
  const delay = Math.floor(Math.random() * 201) + 200;
  setTimeout(() => {
    res.json(mockPatients);
  }, delay);
});

app.listen(3001, () => console.log('Mock API running on port 3001'));
