# Architecture Notes — NVDA Serverless Data Lake

## Problem Statement
Build a scalable, serverless data lake on AWS that ingests, catalogs, and queries a structured dataset using AWS native services. The solution must prioritize cost control and be suitable for production patterns (separation of zones, least privilege, and optimized query performance).

## Dataset
NVIDIA (NVDA) daily historical price data (CSV).  
Key fields: `date`, `open`, `high`, `low`, `close`, `volume`.

## Target Architecture (Serverless)
**S3 (Landing/Raw/Curated)** → **Glue Data Catalog** → **Athena (SQL analytics)** → **Curated Parquet** → **Analytics Views** → **Static Dashboard (GitHub Pages)**

### Storage Zones (S3)
- `landing/finance/`  
  Raw ingested files as-is (CSV). Minimal transformation.
- `curated/finance/`  
  Analytics-optimized Parquet output produced via Athena CTAS.
- `athena-results/`  
  Athena query results output location.

## Design Decisions

### Why Parquet + Compression
- Columnar storage reduces scanned bytes for analytics queries.
- SNAPPY compression improves cost/performance without heavy CPU overhead.

### Why Partition by **Year** (not Year+Month)
Attempting `year, month` partitions across 1999–2026 created too many open partition writers during CTAS, causing:
- `HIVE_TOO_MANY_OPEN_PARTITIONS` (limit ~100 open writers)

Partitioning by **year only** keeps partitions manageable (~28 years) and still provides strong pruning for typical time-bounded queries.

### Why Athena CTAS for “ETL”
Instead of Glue Jobs (which can introduce extra cost/complexity), Athena CTAS was used as a serverless transformation step:
- casts types
- writes Parquet
- creates partitioned curated layer

This is a common lightweight data-lake pattern for small/medium datasets.

## Cost Optimization Evidence
- Partition pruning: filtering on `WHERE year = 2025` scanned effectively 0 MB (Athena console displayed 0 MB in recent queries).
- Parquet format reduces scan volume versus CSV.

## Governance / Security Notes
- Keep S3 buckets private by default.
- Use least-privilege IAM for:
  - Glue crawler role: read only landing prefixes + write catalog metadata
  - Athena access: query permissions + read curated/landing prefixes
- Optional: Lake Formation can enforce fine-grained access control (not required for this submission).

## Operational Hygiene
- Athena creates many small “Unsaved” CSV outputs under `athena-results/Unsaved/...`.
- Recommended: S3 lifecycle rule to expire `athena-results/Unsaved/` after 7–14 days to reduce clutter.

## Known Limitations
- Dashboard data is exported manually from Athena to CSV.
- No automated ingestion schedule (can be added later using EventBridge + Lambda).

## Next Enhancements (Still Low/Cost-Aware)
- Add automation: Lambda triggered on new S3 objects (landing) to run a curated refresh pipeline.
- Add “recent years” month partitions (e.g., 2019+) for finer pruning without hitting writer limits.
- Add additional derived metrics: volatility, drawdown, crash-day detector views.

<img width="1895" height="677" alt="ARCHITECTURE DIAGRAM drawio" src="https://github.com/user-attachments/assets/72ab54e0-0b34-4189-856c-91c317db3df5" />

