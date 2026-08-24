-- Two fixes to the category taxonomy, per the user's request to keep
-- Économie, Politique, Société, Santé, International, Technologie,
-- Sport, Insolite, and Culture as the nine MAIN (top-level) nav
-- categories, with everything else nested as a subcategory of its
-- proper parent.

-- 1) "Environnement" was seeded TWICE with conflicting intent:
--    - migrations/01_create_tables.sql seeded it as a 10th TOP-LEVEL
--      category (order_index 10) - never part of the requested main-nav
--      list.
--    - migrations/03_seed_subcategories.sql tried to seed it AGAIN as a
--      subcategory of Société, but that insert was silently skipped
--      (ON CONFLICT (slug) DO NOTHING) because the slug 'environnement'
--      was already taken by the top-level row from 01 - that migration's
--      own comment calls this out as a known collision.
--    Fix: re-parent the existing top-level 'environnement' row under
--    Société instead of leaving it as a spurious 10th main category.
UPDATE categories
SET parent_id = (SELECT id FROM categories WHERE slug = 'societe' AND parent_id IS NULL),
    order_index = 4
WHERE slug = 'environnement' AND parent_id IS NULL;

-- 2) Culture already exists as a real top-level category (seeded in
--    01_create_tables.sql) but has never had any subcategories of its
--    own - unlike every other main category. Seeding a starter set here
--    so it isn't the only empty one in the nav; feel free to rename/add
--    to these in /admin/categories.
INSERT INTO categories (name, slug, parent_id, order_index)
SELECT v.name, v.slug, p.id, v.order_index
FROM (VALUES
  ('Musique', 'musique', 1),
  ('Cinéma', 'cinema', 2),
  ('Littérature', 'litterature', 3),
  ('Arts', 'arts', 4),
  ('Mode', 'mode', 5)
) AS v(name, slug, order_index)
JOIN categories p ON p.slug = 'culture' AND p.parent_id IS NULL
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';
