# NVIDIA Serverless Data Lake on AWS (Free-Tier Friendly)

This project implements a serverless data lake on AWS for analyzing NVIDIA (NVDA) historical stock data using:
- **Amazon S3** (landing + curated storage)
- **AWS Glue Data Catalog** (schema + metadata)
- **Amazon Athena** (serverless SQL analytics)
- **Parquet curated layer** with partition pruning
- **Static dashboard** (no paid BI tools) deployed via S3 Bucket

## Architecture
S3 (Landing) → Glue Crawler/Data Catalog → Athena Queries/CTAS → S3 (Curated Parquet) → Athena Views → Static Dashboard

## S3 Structure (example)
- `landing/finance/` — raw CSV ingestion
- `curated/finance/nvda_daily_y_v1/` — curated Parquet partitioned by year
- `athena-results/` — Athena output location

## Key Outputs
### Curated table
- `finance_lake_db.curated_nvda_daily_y` (Parquet + year partition)

### Analytics views
- `finance_lake_db.v_nvda_daily_returns`
- `finance_lake_db.v_nvda_moving_avg_30d`
- `finance_lake_db.v_nvda_monthly_summary`

## Dashboard
The dashboard lives in `/dashboard` and reads exported Athena results:
- `dashboard/data/monthly_summary.csv`
- `dashboard/data/moving_avg.csv`
- `dashboard/data/daily_returns.csv`

### Local run
You must serve the dashboard via a local server (fetch() won’t work by double-clicking HTML).

From the `dashboard/` folder:
```bash
python -m http.server 5500
