/* The community board, in the same hsx-mail database as the mailbox.
   Apply once:  npx wrangler d1 execute hsx-mail --remote --file community.sql */

/* one row per voter per month; voting again moves the vote. No name, email or IP:
   voter is a random id the browser keeps, net_hash a salted hash that rotates monthly */
CREATE TABLE IF NOT EXISTS votes (
  month       TEXT NOT NULL,
  voter       TEXT NOT NULL,
  net_hash    TEXT NOT NULL,
  app         TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (month, voter)
);
CREATE INDEX IF NOT EXISTS idx_votes_app ON votes(month, app);
CREATE INDEX IF NOT EXISTS idx_votes_net ON votes(month, net_hash);

/* app feedback and ideas; name and email are optional */
CREATE TABLE IF NOT EXISTS feedback (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,              -- feedback | idea
  app         TEXT NOT NULL,
  liked       TEXT,
  improve     TEXT,
  name        TEXT,
  email       TEXT,
  net_hash    TEXT NOT NULL,              -- salted, rotates daily; rate limiting only
  created_at  TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'new' -- new | read | done
);
CREATE INDEX IF NOT EXISTS idx_feedback_net ON feedback(net_hash, created_at);

/* Bug Hunt reports; name and email are required so a reward can reach the reporter */
CREATE TABLE IF NOT EXISTS bug_reports (
  id          TEXT PRIMARY KEY,
  app         TEXT NOT NULL,
  version     TEXT,
  windows     TEXT,
  severity    TEXT NOT NULL,
  title       TEXT NOT NULL,
  steps       TEXT NOT NULL,
  expected    TEXT,
  actual      TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  credit      TEXT,
  net_hash    TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' -- new | confirmed | duplicate | not-a-bug | fixed
);
CREATE INDEX IF NOT EXISTS idx_bugs_net ON bug_reports(net_hash, created_at);
