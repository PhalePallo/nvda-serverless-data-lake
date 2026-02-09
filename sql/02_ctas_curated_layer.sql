-- Curated Parquet table partitioned by year (to avoid open partitions limit)
CREATE TABLE finance_lake_db.curated_nvda_daily_y
WITH (
  format = 'PARQUET',
  external_location = 's3://finance-lake-nvda-pallo/curated/finance/nvda_daily_y_v1/',
  partitioned_by = ARRAY['year'],
  write_compression = 'SNAPPY'
) AS
SELECT
  CAST(date AS DATE)        AS trade_date,
  CAST(open AS DOUBLE)      AS open,
  CAST(high AS DOUBLE)      AS high,
  CAST(low AS DOUBLE)       AS low,
  CAST(close AS DOUBLE)     AS close,
  CAST(volume AS BIGINT)    AS volume,
  YEAR(CAST(date AS DATE))  AS year
FROM finance_lake_db.landing_finance_lake_nvda_pallo
WHERE date IS NOT NULL;
