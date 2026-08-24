-- Two corrections to the taxonomy from 13_restructure_category_taxonomy.sql,
-- per the user's updated list:
--   Société: add "Réflexions" (between Communauté and Environnement)
--   Culture: drop "Événements" (Culture is now just Musique, Arts,
--            Littérature, Patrimoine)
--
-- Safe to run more than once: the insert uses ON CONFLICT (slug) DO
-- NOTHING and the delete is a no-op once the row is gone.

-- ------------------------------------------------
-- 1) Add "Réflexions" to Société and shift ordering after it
-- ------------------------------------------------
UPDATE categories SET order_index = 5 WHERE slug = 'environnement';
UPDATE categories SET order_index = 6 WHERE slug = 'evenements';
UPDATE categories SET order_index = 7 WHERE slug = 'meteo';

INSERT INTO categories (name, slug, parent_id, order_index)
SELECT 'Réflexions', 'reflexions', p.id, 4
FROM categories p
WHERE p.slug = 'societe' AND p.parent_id IS NULL
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------
-- 2) Remove "Événements" from Culture (slug 'evenements-culturels',
--    disambiguated from Société's own 'evenements' in migration 13)
-- ------------------------------------------------
DELETE FROM categories WHERE slug = 'evenements-culturels';

NOTIFY pgrst, 'reload schema';
