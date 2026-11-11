-- Aggregate marginals only: no visitor, request, session or event-level records.
CREATE TABLE IF NOT EXISTS counters (
  period_kind TEXT NOT NULL CHECK (period_kind IN ('day','month')),
  period TEXT NOT NULL CHECK (length(period) = 10),
  page TEXT NOT NULL CHECK (length(page) BETWEEN 1 AND 64),
  event TEXT NOT NULL CHECK (event IN ('page_view','outbound_click','docs_open','chapter_engaged','web_vital','not_found')),
  dimension TEXT NOT NULL CHECK (dimension IN ('total','referrer','device','browser','target','LCP','INP','CLS')),
  value TEXT NOT NULL CHECK (length(value) BETWEEN 1 AND 64),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0 AND typeof(count) = 'integer'),
  PRIMARY KEY (period_kind, period, page, event, dimension, value)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS maintenance (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_purged TEXT NOT NULL
);
