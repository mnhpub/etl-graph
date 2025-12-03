import pg from 'pg';

const { Pool } = pg;

// Instagres compatible PostgreSQL connection
// Uses standard PostgreSQL connection string format
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/etl_graph',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export interface EtlRecord {
  id?: number;
  source_id: string;
  category: string;
  value: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
  created_at?: Date;
}

export async function checkConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

export async function initializeSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS etl_records (
        id SERIAL PRIMARY KEY,
        source_id VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        value NUMERIC NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_etl_records_category ON etl_records(category);
      CREATE INDEX IF NOT EXISTS idx_etl_records_timestamp ON etl_records(timestamp);
    `);
  } finally {
    client.release();
  }
}

export async function insertRecords(records: EtlRecord[]): Promise<number> {
  if (records.length === 0) return 0;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let inserted = 0;
    for (const record of records) {
      const result = await client.query(
        `INSERT INTO etl_records (source_id, category, value, timestamp, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_id) DO UPDATE SET
           category = EXCLUDED.category,
           value = EXCLUDED.value,
           timestamp = EXCLUDED.timestamp,
           metadata = EXCLUDED.metadata
         RETURNING id`,
        [record.source_id, record.category, record.value, record.timestamp, JSON.stringify(record.metadata)]
      );
      if (result.rowCount && result.rowCount > 0) inserted++;
    }
    
    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface AnalyticsResult {
  summary: {
    totalRecords: number;
    avgValue: number;
    maxValue: number;
    minValue: number;
  };
  distribution: Array<{
    category: string;
    value: number;
    count: number;
  }>;
  timeSeries: Array<{
    category: string;
    value: number;
  }>;
}

export async function getAnalytics(): Promise<AnalyticsResult> {
  const client = await pool.connect();
  try {
    // Summary statistics
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*)::int as total_records,
        COALESCE(AVG(value), 0)::float as avg_value,
        COALESCE(MAX(value), 0)::float as max_value,
        COALESCE(MIN(value), 0)::float as min_value
      FROM etl_records
    `);
    
    const summary = summaryResult.rows[0];
    
    // Distribution by category
    const distributionResult = await client.query(`
      SELECT 
        category,
        SUM(value)::float as value,
        COUNT(*)::int as count
      FROM etl_records
      GROUP BY category
      ORDER BY value DESC
      LIMIT 10
    `);
    
    // Time series - aggregate by date
    const timeSeriesResult = await client.query(`
      SELECT 
        TO_CHAR(timestamp, 'YYYY-MM-DD') as category,
        SUM(value)::float as value
      FROM etl_records
      GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD')
      ORDER BY category
      LIMIT 30
    `);
    
    return {
      summary: {
        totalRecords: summary.total_records || 0,
        avgValue: parseFloat(summary.avg_value) || 0,
        maxValue: parseFloat(summary.max_value) || 0,
        minValue: parseFloat(summary.min_value) || 0
      },
      distribution: distributionResult.rows.map(row => ({
        category: row.category,
        value: parseFloat(row.value) || 0,
        count: row.count
      })),
      timeSeries: timeSeriesResult.rows.map(row => ({
        category: row.category,
        value: parseFloat(row.value) || 0
      }))
    };
  } finally {
    client.release();
  }
}

export async function clearRecords(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE etl_records RESTART IDENTITY');
  } finally {
    client.release();
  }
}

export { pool };
