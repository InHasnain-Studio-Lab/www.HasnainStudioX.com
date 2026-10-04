-- Sent, drafts, Cc and Bcc, flags and conversations for the studio mailbox.
-- Columns are only added, so every stored message is kept as it is.
ALTER TABLE messages ADD COLUMN cc TEXT;
ALTER TABLE messages ADD COLUMN bcc TEXT;
ALTER TABLE messages ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN thread TEXT;
ALTER TABLE messages ADD COLUMN topic TEXT;
ALTER TABLE messages ADD COLUMN draft TEXT;
ALTER TABLE messages ADD COLUMN resend_id TEXT;

-- every existing message starts as its own conversation
UPDATE messages SET thread = id WHERE thread IS NULL;

-- the subject without its reply and forward prefixes, three passes deep
UPDATE messages SET topic = lower(trim(subject)) WHERE topic IS NULL;
UPDATE messages SET topic = trim(substr(topic, 4)) WHERE topic LIKE 're:%' OR topic LIKE 'fw:%' OR topic LIKE 'aw:%';
UPDATE messages SET topic = trim(substr(topic, 5)) WHERE topic LIKE 'fwd:%';
UPDATE messages SET topic = trim(substr(topic, 4)) WHERE topic LIKE 're:%' OR topic LIKE 'fw:%' OR topic LIKE 'aw:%';
UPDATE messages SET topic = trim(substr(topic, 5)) WHERE topic LIKE 'fwd:%';
UPDATE messages SET topic = trim(substr(topic, 4)) WHERE topic LIKE 're:%' OR topic LIKE 'fw:%' OR topic LIKE 'aw:%';

-- a stored message that answers another joins that message's conversation
UPDATE messages SET thread = (
  SELECT m2.thread FROM messages m2
  WHERE m2.message_id = messages.in_reply_to AND m2.message_id <> '' LIMIT 1
)
WHERE in_reply_to <> '' AND EXISTS (
  SELECT 1 FROM messages m2 WHERE m2.message_id = messages.in_reply_to AND m2.message_id <> ''
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread, received_at);
CREATE INDEX IF NOT EXISTS idx_messages_topic ON messages(topic);
