# ETL Graph

A full-stack ETL and data visualization application built with Turborepo, Vite, React, AMCharts, DuckDB, and PostgreSQL.

## Architecture

This is a monorepo using Turborepo with the following structure:

```
├── apps/
│   ├── web/          # React UI with Vite and AMCharts
│   └── api/          # Express API server
├── packages/
│   ├── db/           # PostgreSQL database utilities (Instagres compatible)
│   └── etl-function/ # ETL serverless function with DuckDB
```

## Features

- **React UI** with Vite for fast development and hot module replacement
- **AMCharts 5** for interactive data visualization (bar charts, line charts)
- **ETL Button** that triggers data extraction, transformation, and loading
- **DuckDB** for efficient JSON data processing and schema discovery
- **PostgreSQL** for persistent data storage (configured for Instagres)
- **Statistical Analytics API** for serving aggregated data queries

## Prerequisites

- Node.js 18+
- PostgreSQL database (or Instagres connection)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your database connection string
```

3. Start development servers:

```bash
npm run dev
```

The web UI will be available at `http://localhost:3000` and the API at `http://localhost:3001`.

## Usage

1. Open the web UI in your browser
2. Click "Run ETL Process" to fetch data from the API, process it with DuckDB, and load it into PostgreSQL
3. View the charts that display the analytics data
4. Use "Refresh Data" to update the charts with the latest data

## API Endpoints

- `GET /api/health` - Health check and database connection status
- `POST /api/etl/run` - Trigger the ETL process
- `GET /api/analytics` - Get statistical analytics data

## Configuration

Environment variables:

- `DATABASE_URL` - PostgreSQL connection string (Instagres compatible)
- `DATABASE_SSL` - Enable SSL for database connections (`true`/`false`)
- `ETL_API_ENDPOINT` - Source API endpoint for ETL data
- `PORT` - API server port (default: 3001)

## Building for Production

```bash
npm run build
```

This will build all apps and packages in the monorepo.
