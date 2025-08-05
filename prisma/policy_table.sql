CREATE TABLE IF NOT EXISTS policies (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text        NOT NULL,
  policenummer text        NOT NULL,
  udloebsdato  date,
  premie       numeric,
  daekning     numeric,
  selvrisiko   numeric,
  type         text,
  created_at   timestamp   NOT NULL DEFAULT NOW()
); 