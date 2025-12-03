import { useState, useEffect, useCallback } from 'react';
import { BarChart, LineChart } from './components/Charts';

interface AnalyticsData {
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

function App() {
  const [loading, setLoading] = useState(false);
  const [etlStatus, setEtlStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [etlMessage, setEtlMessage] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setDataLoading(true);
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const runEtl = async () => {
    setLoading(true);
    setEtlStatus('loading');
    setEtlMessage('Running ETL process...');

    try {
      const response = await fetch('/api/etl/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        setEtlStatus('success');
        setEtlMessage(`ETL completed: ${result.recordsProcessed} records processed`);
        // Refresh analytics after successful ETL
        await fetchAnalytics();
      } else {
        setEtlStatus('error');
        setEtlMessage(`ETL failed: ${result.error}`);
      }
    } catch (error) {
      setEtlStatus('error');
      setEtlMessage(`ETL failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>ETL Graph Dashboard</h1>
      <p className="subtitle">Data Analytics powered by DuckDB and PostgreSQL</p>

      <div className="controls">
        <button
          className="primary"
          onClick={runEtl}
          disabled={loading}
        >
          {loading ? 'Running ETL...' : 'Run ETL Process'}
        </button>
        
        <button onClick={fetchAnalytics} disabled={dataLoading}>
          {dataLoading ? 'Loading...' : 'Refresh Data'}
        </button>

        {etlStatus !== 'idle' && (
          <span className={`status ${etlStatus}`}>
            {etlMessage}
          </span>
        )}
      </div>

      {analytics && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{analytics.summary.totalRecords.toLocaleString()}</div>
              <div className="stat-label">Total Records</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.summary.avgValue.toFixed(2)}</div>
              <div className="stat-label">Average Value</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.summary.maxValue.toLocaleString()}</div>
              <div className="stat-label">Maximum Value</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.summary.minValue.toLocaleString()}</div>
              <div className="stat-label">Minimum Value</div>
            </div>
          </div>

          <div className="chart-container">
            <h3 className="chart-title">Value Distribution by Category</h3>
            <BarChart data={analytics.distribution} title="Distribution" />
          </div>

          <div className="chart-container">
            <h3 className="chart-title">Time Series Trend</h3>
            <LineChart data={analytics.timeSeries} title="Trend" />
          </div>
        </>
      )}

      {!analytics && !dataLoading && (
        <div className="chart-container">
          <p>No data available. Click "Run ETL Process" to fetch and process data.</p>
        </div>
      )}
    </div>
  );
}

export default App;
