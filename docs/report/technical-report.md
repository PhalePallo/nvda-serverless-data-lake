# Technical Report (3 pages) — NVIDIA Serverless Data Lake on AWS

## 1. Architecture and Design Decisions

### Objective
Implement a serverless AWS data lake capable of ingesting, cataloging, and querying a structured dataset using AWS-native services while remaining cost-aware and aligned with AWS Solutions Architect Associate best practices.

### High-Level Architecture
**Amazon S3** stores data across zones → **AWS Glue Data Catalog** provides metadata → **Amazon Athena** performs serverless SQL analytics → curated outputs are stored as **Parquet** in S3 → reusable **Athena Views** provide analytics-ready datasets → a **static dashboard** provides visualization without paid BI tooling.

### Dataset
The project uses NVIDIA (NVDA) daily historical price data (CSV), containing date-level OHLCV fields: date, open, high, low, close, volume.

### S3 Zone Layout
- `s3://finance-lake-nvda-pallo/landing/finance/`  
  Landing zone for raw CSV ingestion.
- `s3://finance-lake-nvda-pallo/curated/finance/nvda_daily_y_v1/`  
  Curated zone with Parquet output partitioned by year.
- `s3://finance-lake-nvda-pallo/athena-results/`  
  Athena query results location.

### Key Design Choices
**Parquet + SNAPPY compression** was selected for the curated layer to reduce Athena scan cost and improve performance.  
**Partitioning by year** was selected to enable partition pruning while avoiding CTAS operational limits (too many open partition writers) encountered with year+month partitioning over a long historical range (1999–2026).  
**Athena CTAS** was chosen as a serverless transformation mechanism to convert landing CSV into typed, partitioned Parquet without managing ETL infrastructure.

---

## 2. Glue and Athena Usage

### Glue Data Catalog
A Glue Database was created:
- `finance_lake_db`

A Glue crawler was configured to crawl the S3 landing path and infer schema. This created a catalog table:
- `landing_finance_lake_nvda_pallo` (CSV)

This table enabled Athena to query the dataset directly in S3.

### Curated Layer (Athena CTAS)
A curated Parquet table was created using Athena CTAS:
- `curated_nvda_daily_y`

Transformations applied:
- Cast `date` to `DATE` (`trade_date`)
- Cast numeric fields to appropriate types (`DOUBLE` for prices, `BIGINT` for volume)
- Add `year` derived from `trade_date`
- Partition the curated table by `year`
- Write Parquet with SNAPPY compression to a curated S3 prefix

### Analytics Views
Three Athena views were created to support reusable analytics:
1. `v_nvda_daily_returns`  
   Computes daily returns using window functions (`LAG`).
2. `v_nvda_moving_avg_30d`  
   Computes 30-day simple moving average (SMA) using window functions.
3. `v_nvda_monthly_summary`  
   Summarizes yearly trading days, avg/max/min close, and total volume.

These views provide reusable “semantic layer” abstractions for analytics and dashboards.

---

## 3. Cost Optimization, Governance, and Enhancements

### Cost Optimization
**Partitioning** enables pruning so queries targeting a single year scan only the relevant partition.  
In the Athena console, queries filtered by `WHERE year = 2025` reported extremely low scan size (displayed as 0 MB in the recent queries view), demonstrating effective pruning and cost control.  
Additionally, **Parquet** reduces scan size compared to CSV due to columnar storage.

Recommended operational improvement:
- Apply an S3 lifecycle rule to `athena-results/Unsaved/` to expire objects after 7–14 days.

### Governance and Access Control
Security follows least-privilege principles:
- Keep S3 buckets private by default.
- Use IAM roles/policies that scope access to specific prefixes:
  - Glue crawler: read landing prefixes + write catalog metadata
  - Athena: read curated/landing prefixes + write Athena results to `athena-results/`
Optional enhancement:
- Use AWS Lake Formation to enforce fine-grained permissions for tables and columns.

### Known Limitations
- Dashboard uses exported Athena results (CSV) and is refreshed manually.
- Dataset is a single domain (finance); no federated joins with other sources yet.

### Future Enhancements
- Automation: EventBridge + Lambda to trigger refresh when new landing data arrives.
- Create a “recent years” month-partitioned curated layer (e.g., 2019+) for finer pruning without exceeding writer limits.
- Add additional analytics views (volatility, drawdown, crash-day detection).
- Add CI checks for repo hygiene and reproducibility (SQL scripts, docs completeness).

---

## Appendix: Implemented Artifacts
- Glue Database: `finance_lake_db`
- Tables: `landing_finance_lake_nvda_pallo`, `curated_nvda_daily_y`
- Views: `v_nvda_daily_returns`, `v_nvda_moving_avg_30d`, `v_nvda_monthly_summary`
- Dashboard: Static site reading exported CSVs from `dashboard/data/`
