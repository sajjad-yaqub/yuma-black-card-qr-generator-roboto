CREATE TABLE public.card_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id text NOT NULL UNIQUE,
  card_id_numeric bigint GENERATED ALWAYS AS (
    NULLIF(regexp_replace(card_id, '\D', '', 'g'), '')::bigint
  ) STORED,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_ids_numeric ON public.card_ids (card_id_numeric);

ALTER TABLE public.card_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card IDs are publicly readable"
  ON public.card_ids FOR SELECT
  USING (true);