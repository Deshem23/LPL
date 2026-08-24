-- Seeds subcategory rows (categories with a non-null parent_id) matching
-- the static nav config at src/lib/config/categories.ts. Without these,
-- every subcategory page (/categories/[slug]/[subslug]) has no real DB
-- row to resolve against, so it can never show articles - it would
-- always render the empty state, even once articles exist, because the
-- code correctly finds no matching subcategory.
--
-- Safe to run more than once: ON CONFLICT (slug) DO NOTHING skips rows
-- that already exist. Note: 'environnement' is already used as a
-- top-level category slug (seeded in 01_create_tables.sql), so the
-- Société > Environnement subcategory below is skipped due to that
-- slug collision - rename one side if you want both.

INSERT INTO categories (name, slug, parent_id, order_index)
SELECT v.name, v.slug, p.id, v.order_index
FROM (VALUES
  -- Économie
  ('Finance', 'finance', 'economie', 1),
  ('Entreprises', 'entreprises', 'economie', 2),
  ('Investissement', 'investissement', 'economie', 3),
  -- Société
  ('Éducation', 'education', 'societe', 1),
  ('Événement', 'evenement', 'societe', 2),
  ('Opinion', 'opinion', 'societe', 3),
  ('Environnement', 'environnement', 'societe', 4),
  -- Politique
  ('Nationale', 'nationale', 'politique', 1),
  ('Internationale', 'internationale', 'politique', 2),
  -- Santé
  ('Bien-être', 'bien-etre', 'sante', 1),
  ('Médecine', 'medecine', 'sante', 2),
  -- International
  ('Afrique', 'afrique', 'international', 1),
  ('Europe', 'europe', 'international', 2),
  ('Amériques', 'ameriques', 'international', 3),
  ('Asie', 'asie', 'international', 4),
  ('Océanie', 'oceanie', 'international', 5),
  ('Moyen-Orient', 'moyen-orient', 'international', 6),
  -- Technologie
  ('Intelligence Artificielle', 'ia', 'technologie', 1),
  ('Innovation', 'innovation', 'technologie', 2),
  ('Recherche', 'recherche', 'technologie', 3),
  ('Gadgets', 'gadgets', 'technologie', 4),
  -- Sport
  ('Football', 'football', 'sport', 1),
  ('Basketball', 'basketball', 'sport', 2),
  ('Tennis', 'tennis', 'sport', 3),
  ('Général', 'general', 'sport', 4),
  -- Insolite
  ('Curiosités', 'curiosites', 'insolite', 1),
  ('Viral', 'viral', 'insolite', 2)
) AS v(name, slug, parent_slug, order_index)
JOIN categories p ON p.slug = v.parent_slug AND p.parent_id IS NULL
ON CONFLICT (slug) DO NOTHING;
