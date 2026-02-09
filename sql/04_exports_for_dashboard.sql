-- Export for dashboard charts
SELECT * FROM finance_lake_db.v_nvda_monthly_summary ORDER BY year;
SELECT * FROM finance_lake_db.v_nvda_moving_avg_30d ORDER BY trade_date;
SELECT * FROM finance_lake_db.v_nvda_daily_returns ORDER BY trade_date;
