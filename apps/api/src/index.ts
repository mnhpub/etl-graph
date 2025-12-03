import express from 'express';
import cors from 'cors';
import { runEtl } from '@etl-graph/etl-function';
import { getAnalytics, checkConnection } from '@etl-graph/db';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const dbConnected = await checkConnection();
    res.json({
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ETL endpoint - triggers the ETL process
app.post('/api/etl/run', async (_req, res) => {
  try {
    console.log('Starting ETL process...');
    const result = await runEtl();
    console.log('ETL process completed:', result);
    res.json(result);
  } catch (error) {
    console.error('ETL process failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Analytics endpoint - serves statistical analytics data
app.get('/api/analytics', async (_req, res) => {
  try {
    const analytics = await getAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
