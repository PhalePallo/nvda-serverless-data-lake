CREATE OR REPLACE VIEW finance_lake_db.v_nvda_daily_returns AS
SELECT
  trade_date,
  close,
  (close - LAG(close) OVER (ORDER BY trade_date))
    / NULLIF(LAG(close) OVER (ORDER BY trade_date), 0) AS daily_return
FROM finance_lake_db.curated_nvda_daily_y;

CREATE OR REPLACE VIEW finance_lake_db.v_nvda_moving_avg_30d AS
SELECT
  trade_date,
  close,
  AVG(close) OVER (
    ORDER BY trade_date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS sma_30
FROM finance_lake_db.curated_nvda_daily_y;

CREATE OR REPLACE VIEW finance_lake_db.v_nvda_monthly_summary AS
SELECT
  year,
  COUNT(*) AS trading_days,
  AVG(close) AS avg_close,
  MAX(close) AS max_close,
  MIN(close) AS min_close,
  SUM(volume) AS total_volume
FROM finance_lake_db.curated_nvda_daily_y
GROUP BY year
ORDER BY year DESC;
