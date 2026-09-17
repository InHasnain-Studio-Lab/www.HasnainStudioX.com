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

/* One row per received message, in the hsx-mail database. The body is kept as
   both parts so the reading pane can show what the sender actually sent, and
   attachments are recorded by name and size only: the bytes stay out of the
   database and the Outlook copy keeps them. */
CREATE TABLE IF NOT EXISTS messages (
  id           TEXT PRIMARY KEY,
  message_id   TEXT,
  in_reply_to  TEXT,
  refs         TEXT,
  sender       TEXT NOT NULL,
  sender_name  TEXT,
  recipient    TEXT,
  subject      TEXT NOT NULL,
  body_text    TEXT,
  body_html    TEXT,
  files        TEXT,
  received_at  TEXT NOT NULL,
  state        TEXT NOT NULL DEFAULT 'inbox',   -- inbox | archived
  unread       INTEGER NOT NULL DEFAULT 1,
  replied      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_state ON messages(state, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_msgid ON messages(message_id);
