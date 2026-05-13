## Goal

Move from manual CSV editing to a backend-loaded catalogue of card IDs. Users search by exact card ID (single) or by numeric range, then generate/download front+back images or PDFs (single card or bulk ZIP).

## Steps

### 1. Enable Lovable Cloud + create `card_ids` table

- Enable Cloud.
- Migration creates `public.card_ids`:
  - `id uuid pk default gen_random_uuid()`
  - `card_id text not null unique` — the full value used for QR + filename
  - `card_id_numeric bigint` — generated/derived numeric form for range queries (nullable for non-numeric IDs)
  - `source text` — optional label for which CSV batch it came from
  - `created_at timestamptz default now()`
- Indexes: unique on `card_id`, btree on `card_id_numeric`.
- RLS: enable, public `SELECT` policy (read-only catalogue, no PII). No insert/update/delete policies — you load data via SQL/CSV import in the Cloud dashboard.

You add new CSVs by importing them into this table from the Cloud dashboard (Database → Table → Import CSV). No admin UI built.

### 2. Rebuild the page UI

Replace `CSVEditor` flow with two tabs/sections inside `QRCodeGenerator.tsx`:

**A. Single search**
- Input field "Search by Card ID" with debounced lookup against `card_ids` (exact match, fallback to suffix match on the last 11 chars to mirror current filename rule).
- On match: render the existing `ImagePreview` for that one card with Download Front PNG / Back PNG / Front PDF / Back PDF buttons.

**B. Range search**
- Two inputs: `From` and `To` numeric card IDs.
- Query: `select card_id from card_ids where card_id_numeric between :from and :to order by card_id_numeric`.
- Show count + two buttons: "Download all as PNG ZIP" and "Download all as PDF ZIP" — reuses existing batched generation pipeline.
- Hard cap (e.g. 1000) per range to protect the browser; warn if exceeded.

### 3. Generation pipeline

Keep `generateQRCode`, `createGradientQR`, `overlayOnImage`, `downloadAllAsZip`, `downloadAllPDFsAsZip` exactly as they are. They now receive their input list from Cloud queries instead of `csvData`. Filename rule unchanged.

### 4. Cleanup

- Remove `CSVEditor` and `FileUpload` from the page (keep files for now in case you want them later, or delete — your call; default: delete).
- Keep card-front.png / card-back.png assets.

## Technical notes

- `card_id_numeric` populated either by trigger (`generated always as ((nullif(regexp_replace(card_id,'\D','','g'),''))::bigint) stored`) or set during CSV import. Plan uses generated column so imports stay one-step.
- All Cloud reads happen client-side via the Supabase JS client; no edge functions required.
- Range queries are paginated server-side (`.range()`) if cap raised later.

## Out of scope

- Admin upload UI, auth, write policies — you'll manage data via the Cloud dashboard.
- Changing card design, filename rule, or ZIP folder structure.
