import duckdb from 'duckdb';
import { initializeSchema, insertRecords, type EtlRecord } from '@etl-graph/db';

// Sample API endpoint for demonstration - can be configured via environment variable
const API_ENDPOINT = process.env.ETL_API_ENDPOINT || 'https://jsonplaceholder.typicode.com/posts';

interface EtlResult {
  success: boolean;
  recordsProcessed: number;
  schemaFields?: string[];
  error?: string;
}

interface RawRecord {
  id?: string | number;
  userId?: number;
  title?: string;
  body?: string;
  [key: string]: unknown;
}

async function fetchJsonData(): Promise<RawRecord[]> {
  const response = await fetch(API_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from API: ${response.statusText}`);
  }
  return response.json();
}

function createDuckDbConnection(): duckdb.Database {
  return new duckdb.Database(':memory:');
}

async function processWithDuckDb(data: RawRecord[]): Promise<{ records: EtlRecord[], schema: string[] }> {
  return new Promise((resolve, reject) => {
    const db = createDuckDbConnection();
    const conn = db.connect();

    try {
      // Create table and insert JSON data
      conn.run(`
        CREATE TABLE raw_data (
          id VARCHAR,
          user_id INTEGER,
          title VARCHAR,
          body VARCHAR,
          json_data JSON
        )
      `);

      const insertStmt = conn.prepare(`
        INSERT INTO raw_data (id, user_id, title, body, json_data)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const record of data) {
        insertStmt.run(
          String(record.id || ''),
          record.userId || 0,
          record.title || '',
          record.body || '',
          JSON.stringify(record)
        );
      }
      insertStmt.finalize();

      // Query to get schema information
      conn.all(`DESCRIBE raw_data`, (err, schemaRows) => {
        if (err) {
          reject(err);
          return;
        }

        const schema = (schemaRows as Array<{ column_name: string }>).map(row => row.column_name);

        // Transform data for PostgreSQL
        conn.all(`
          SELECT 
            id,
            user_id,
            title,
            LENGTH(body) as value,
            json_data
          FROM raw_data
        `, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const records: EtlRecord[] = (rows as Array<{
            id: string;
            user_id: number;
            title: string;
            value: number;
            json_data: string;
          }>).map(row => ({
            source_id: `post_${row.id}`,
            category: `user_${row.user_id}`,
            value: row.value || 0,
            timestamp: new Date(),
            metadata: {
              title: row.title,
              original: JSON.parse(row.json_data)
            }
          }));

          db.close();
          resolve({ records, schema });
        });
      });
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

export async function runEtl(): Promise<EtlResult> {
  try {
    console.log('ETL: Fetching data from API...');
    const rawData = await fetchJsonData();
    console.log(`ETL: Fetched ${rawData.length} records`);

    console.log('ETL: Processing data with DuckDB...');
    const { records, schema } = await processWithDuckDb(rawData);
    console.log(`ETL: Processed ${records.length} records`);

    console.log('ETL: Initializing PostgreSQL schema...');
    await initializeSchema();

    console.log('ETL: Inserting records into PostgreSQL...');
    const insertedCount = await insertRecords(records);
    console.log(`ETL: Inserted ${insertedCount} records`);

    return {
      success: true,
      recordsProcessed: insertedCount,
      schemaFields: schema
    };
  } catch (error) {
    console.error('ETL Error:', error);
    return {
      success: false,
      recordsProcessed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
