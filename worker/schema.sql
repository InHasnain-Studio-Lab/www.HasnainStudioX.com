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
  state        TEXT NOT NULL DEFAULT 'inbox',   -- inbox | archived | sent | draft
  unread       INTEGER NOT NULL DEFAULT 1,
  replied      INTEGER NOT NULL DEFAULT 0,
  cc           TEXT,
  bcc          TEXT,
  flagged      INTEGER NOT NULL DEFAULT 0,
  thread       TEXT,                            -- conversation key, shared by every message in it
  topic        TEXT,                            -- subject without Re: and Fwd:, to join a conversation
  draft        TEXT,                            -- the composer's own fields, for a draft
  resend_id    TEXT                             -- Resend's id for a sent message
);

CREATE INDEX IF NOT EXISTS idx_messages_state ON messages(state, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_msgid ON messages(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread, received_at);
CREATE INDEX IF NOT EXISTS idx_messages_topic ON messages(topic);
