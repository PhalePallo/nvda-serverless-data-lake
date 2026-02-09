-- Landing check
SELECT * FROM finance_lake_db.landing_finance_lake_nvda_pallo LIMIT 10;

-- Landing total rows
SELECT COUNT(*) AS total_rows FROM finance_lake_db.landing_finance_lake_nvda_pallo;

-- Summary stats
SELECT
  MIN(date) AS first_date,
  MAX(date) AS last_date,
  AVG(close) AS average_close_price,
  SUM(volume) AS total_volume
FROM finance_lake_db.landing_finance_lake_nvda_pallo;
