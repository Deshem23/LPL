-- ============================================
-- RESTRUCTURE CATEGORY TAXONOMY (per user's exact list)
-- ============================================
-- Final desired taxonomy (top-level categories unchanged - already fixed
-- in 12_fix_environnement_and_seed_culture.sql):
--
--   Économie:      Finances, Entreprises, Emploi, Immobilier
--   Politique:     Gouvernance, Élections, Diplomatie, Débats, Opinion
--   Société:       Éducation, Justice, Communauté, Environnement, Événements, Météo
--   Santé:         Publique, Bien-être, Médecine
--   International: Caraïbes, Géopolitique, Diaspora, Divers
--   Technologie:   IA, Recherche, Innovation, Cybersécurité, Gadgets
--   Sport:         Football, Basketball, Athlétisme, Compétitions
--   Insolite:      Curiosités, Viral, Mythes
--   Culture:       Musique, Arts, Littérature, Patrimoine, Événements
--
-- This replaces the placeholder subcategories seeded in
-- 03_seed_subcategories.sql / 12_fix_environnement_and_seed_culture.sql.
-- Safe to run more than once: renames/reparents are plain UPDATEs
-- (no-op the 2nd time), inserts use ON CONFLICT (slug) DO NOTHING, and
-- deletes are no-ops once the rows are gone.
--
-- Note on FKs: articles.category_id is ON DELETE SET NULL, so any
-- article already assigned to a subcategory removed below will simply
-- lose its subcategory (fall back to its top-level category) rather
-- than being deleted or causing an error.

-- ------------------------------------------------
-- 1) Rename existing rows that map onto a new name
-- ------------------------------------------------
UPDATE categories SET name = 'Finances', slug = 'finances'
WHERE slug = 'finance';

UPDATE categories SET name = 'Événements', slug = 'evenements', order_index = 5
WHERE slug = 'evenement';

-- ------------------------------------------------
-- 2) Re-parent "Opinion" from Société to Politique
-- ------------------------------------------------
UPDATE categories
SET parent_id = (SELECT id FROM categories WHERE slug = 'politique' AND parent_id IS NULL),
    order_index = 5
WHERE slug = 'opinion';

-- ------------------------------------------------
-- 3) Fix ordering on subcategories that are kept but reordered
-- ------------------------------------------------
UPDATE categories SET order_index = 2 WHERE slug = 'recherche';
UPDATE categories SET order_index = 3 WHERE slug = 'innovation';
UPDATE categories SET order_index = 5 WHERE slug = 'gadgets';
UPDATE categories SET order_index = 2 WHERE slug = 'bien-etre';
UPDATE categories SET order_index = 3 WHERE slug = 'medecine';
UPDATE categories SET order_index = 2 WHERE slug = 'arts';

-- ------------------------------------------------
-- 4) Insert the missing subcategories
-- ------------------------------------------------
INSERT INTO categories (name, slug, parent_id, order_index)
SELECT v.name, v.slug, p.id, v.order_index
FROM (VALUES
  -- Économie
  ('Emploi', 'emploi', 'economie', 3),
  ('Immobilier', 'immobilier', 'economie', 4),
  -- Politique
  ('Gouvernance', 'gouvernance', 'politique', 1),
  ('Élections', 'elections', 'politique', 2),
  ('Diplomatie', 'diplomatie', 'politique', 3),
  ('Débats', 'debats', 'politique', 4),
  -- Société
  ('Justice', 'justice', 'societe', 2),
  ('Communauté', 'communaute', 'societe', 3),
  ('Météo', 'meteo', 'societe', 6),
  -- Santé
  ('Publique', 'publique', 'sante', 1),
  -- International
  ('Caraïbes', 'caraibes', 'international', 1),
  ('Géopolitique', 'geopolitique', 'international', 2),
  ('Diaspora', 'diaspora', 'international', 3),
  ('Divers', 'divers', 'international', 4),
  -- Technologie
  ('Cybersécurité', 'cybersecurite', 'technologie', 4),
  -- Sport
  ('Athlétisme', 'athletisme', 'sport', 3),
  ('Compétitions', 'competitions', 'sport', 4),
  -- Insolite
  ('Mythes', 'mythes', 'insolite', 3),
  -- Culture (slug disambiguated from Société's 'evenements')
  ('Patrimoine', 'patrimoine', 'culture', 4),
  ('Événements', 'evenements-culturels', 'culture', 5)
) AS v(name, slug, parent_slug, order_index)
JOIN categories p ON p.slug = v.parent_slug AND p.parent_id IS NULL
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------
-- 5) Remove subcategories that are no longer in the requested list
-- ------------------------------------------------
DELETE FROM categories WHERE slug IN (
  'investissement',                                    -- Économie (replaced by Emploi/Immobilier)
  'nationale', 'internationale',                        -- Politique (replaced by the 5 new ones)
  'tennis', 'general',                                  -- Sport (replaced by Athlétisme/Compétitions)
  'cinema', 'mode',                                     -- Culture (replaced by Patrimoine/Événements)
  'afrique', 'europe', 'ameriques', 'asie', 'oceanie', 'moyen-orient' -- International (replaced by the 4 new ones)
);

NOTIFY pgrst, 'reload schema';
