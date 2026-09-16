/* One row per address. An unsubscribe is kept rather than deleted: under PECR
   an opt-out stands until the person opts in again, so the record has to
   survive to stop the address being re-added by mistake. No IP address is
   stored: the timestamp and the page they signed up from are enough to
   evidence consent, and anything more would contradict what the site says. */
CREATE TABLE IF NOT EXISTS subscribers (
  email           TEXT PRIMARY KEY,
  status          TEXT NOT NULL,          -- pending | confirmed | unsubscribed
  token           TEXT,
  source          TEXT,
  created_at      TEXT NOT NULL,
  confirmed_at    TEXT,
  unsubscribed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_token  ON subscribers(token);
