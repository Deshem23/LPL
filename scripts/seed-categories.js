#!/usr/bin/env node
/**
 * Forces the categories table into the EXACT taxonomy below, no matter
 * what state it's currently in (partially-run SQL migrations, categories
 * created/renamed/reparented by hand in /admin/categories, duplicates,
 * stragglers, etc.).
 *
 * Unlike the numbered .sql migrations in /migrations, this doesn't rely on
 * copy-pasting a script into the Supabase SQL editor (easy to run only
 * part of by accident). It talks straight to Supabase using the same
 * service-role credentials the app itself uses, so it can safely be run
 * as many times as you want - it always reconciles to this exact list:
 *
 *   - Any existing subcategory that matches one of these by slug gets
 *     updated in place (name, parent, order) - articles already assigned
 *     to it keep their assignment.
 *   - Any subcategory missing gets created.
 *   - Any subcategory that exists under one of these 9 main categories
 *     but is NOT in the list below gets deleted (any article assigned to
 *     it just falls back to its main category - nothing is deleted there,
 *     see migrations/01_create_tables.sql's ON DELETE SET NULL).
 *
 * Usage (run from the project root, on your own machine - this needs the
 * real network access to Supabase that this sandbox doesn't have):
 *   node scripts/seed-categories.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

const TAXONOMY = {
  economie: [
    { name: 'Finances', slug: 'finances', order_index: 1 },
    { name: 'Entreprises', slug: 'entreprises', order_index: 2 },
    { name: 'Emploi', slug: 'emploi', order_index: 3 },
    { name: 'Immobilier', slug: 'immobilier', order_index: 4 },
  ],
  politique: [
    { name: 'Gouvernance', slug: 'gouvernance', order_index: 1 },
    { name: 'Élections', slug: 'elections', order_index: 2 },
    { name: 'Diplomatie', slug: 'diplomatie', order_index: 3 },
    { name: 'Débats', slug: 'debats', order_index: 4 },
    { name: 'Opinion', slug: 'opinion', order_index: 5 },
  ],
  societe: [
    { name: 'Éducation', slug: 'education', order_index: 1 },
    { name: 'Justice', slug: 'justice', order_index: 2 },
    { name: 'Communauté', slug: 'communaute', order_index: 3 },
    { name: 'Réflexions', slug: 'reflexions', order_index: 4 },
    { name: 'Environnement', slug: 'environnement', order_index: 5 },
    { name: 'Événements', slug: 'evenements', order_index: 6 },
    { name: 'Météo', slug: 'meteo', order_index: 7 },
  ],
  sante: [
    { name: 'Publique', slug: 'publique', order_index: 1 },
    { name: 'Bien-être', slug: 'bien-etre', order_index: 2 },
    { name: 'Médecine', slug: 'medecine', order_index: 3 },
  ],
  international: [
    { name: 'Caraïbes', slug: 'caraibes', order_index: 1 },
    { name: 'Géopolitique', slug: 'geopolitique', order_index: 2 },
    { name: 'Diaspora', slug: 'diaspora', order_index: 3 },
    { name: 'Divers', slug: 'divers', order_index: 4 },
  ],
  technologie: [
    { name: 'IA', slug: 'ia', order_index: 1 },
    { name: 'Recherche', slug: 'recherche', order_index: 2 },
    { name: 'Innovation', slug: 'innovation', order_index: 3 },
    { name: 'Cybersécurité', slug: 'cybersecurite', order_index: 4 },
    { name: 'Gadgets', slug: 'gadgets', order_index: 5 },
  ],
  sport: [
    { name: 'Football', slug: 'football', order_index: 1 },
    { name: 'Basketball', slug: 'basketball', order_index: 2 },
    { name: 'Athlétisme', slug: 'athletisme', order_index: 3 },
    { name: 'Compétitions', slug: 'competitions', order_index: 4 },
  ],
  insolite: [
    { name: 'Curiosités', slug: 'curiosites', order_index: 1 },
    { name: 'Viral', slug: 'viral', order_index: 2 },
    { name: 'Mythes', slug: 'mythes', order_index: 3 },
  ],
  culture: [
    { name: 'Musique', slug: 'musique', order_index: 1 },
    { name: 'Arts', slug: 'arts', order_index: 2 },
    { name: 'Littérature', slug: 'litterature', order_index: 3 },
    { name: 'Patrimoine', slug: 'patrimoine', order_index: 4 },
  ],
};

// Renames applied first, in place, so existing article assignments to
// these rows are preserved rather than deleted-and-recreated.
const RENAMES = [
  { from: 'finance', to: 'finances', name: 'Finances' },
  { from: 'evenement', to: 'evenements', name: 'Événements' },
];

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log('Fetching current categories...');
  let { data: rows, error } = await supabase.from('categories').select('*');
  if (error) {
    console.error('Failed to fetch categories:', error.message);
    process.exit(1);
  }

  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  // 1) Renames (only if the new slug isn't already taken by another row)
  for (const r of RENAMES) {
    const oldRow = bySlug.get(r.from);
    if (oldRow && !bySlug.get(r.to)) {
      const { error: updErr } = await supabase
        .from('categories')
        .update({ name: r.name, slug: r.to })
        .eq('id', oldRow.id);
      if (updErr) {
        console.error(`  ! Failed to rename ${r.from} -> ${r.to}:`, updErr.message);
      } else {
        console.log(`  renamed ${r.from} -> ${r.to}`);
        oldRow.slug = r.to;
        oldRow.name = r.name;
        bySlug.set(r.to, oldRow);
        bySlug.delete(r.from);
      }
    }
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let missingMains = [];

  for (const [mainSlug, subs] of Object.entries(TAXONOMY)) {
    const main = bySlug.get(mainSlug);
    if (!main || main.parent_id) {
      missingMains.push(mainSlug);
      console.error(`  ! Main category "${mainSlug}" not found (or not top-level) - skipping its subcategories.`);
      continue;
    }

    const desiredSlugs = new Set(subs.map((s) => s.slug));

    for (const sub of subs) {
      const existing = bySlug.get(sub.slug);
      if (!existing) {
        const { data: inserted, error: insErr } = await supabase
          .from('categories')
          .insert([{ name: sub.name, slug: sub.slug, parent_id: main.id, order_index: sub.order_index, is_active: true }])
          .select('*')
          .single();
        if (insErr) {
          console.error(`  ! Failed to create "${sub.name}" under ${mainSlug}:`, insErr.message);
          continue;
        }
        console.log(`  + created ${mainSlug} > ${sub.name}`);
        bySlug.set(sub.slug, inserted);
        created++;
      } else {
        const needsUpdate =
          existing.parent_id !== main.id ||
          existing.name !== sub.name ||
          existing.order_index !== sub.order_index ||
          existing.is_active !== true;
        if (needsUpdate) {
          const { error: updErr } = await supabase
            .from('categories')
            .update({ name: sub.name, parent_id: main.id, order_index: sub.order_index, is_active: true })
            .eq('id', existing.id);
          if (updErr) {
            console.error(`  ! Failed to update "${sub.name}" under ${mainSlug}:`, updErr.message);
            continue;
          }
          console.log(`  ~ updated ${mainSlug} > ${sub.name}`);
          existing.parent_id = main.id;
          existing.name = sub.name;
          existing.order_index = sub.order_index;
          existing.is_active = true;
          updated++;
        }
      }
    }

    // Clean up any child of this main category that isn't in the desired list
    const strays = rows.filter((r) => r.parent_id === main.id && !desiredSlugs.has(r.slug));
    for (const stray of strays) {
      // Re-check against the live map in case this row was just renamed above
      const current = bySlug.get(stray.slug);
      if (!current || current.parent_id !== main.id || desiredSlugs.has(current.slug)) continue;
      const { error: delErr } = await supabase.from('categories').delete().eq('id', stray.id);
      if (delErr) {
        console.error(`  ! Failed to delete stray "${stray.name}" under ${mainSlug}:`, delErr.message);
        continue;
      }
      console.log(`  - deleted stray ${mainSlug} > ${stray.name} (/${stray.slug})`);
      bySlug.delete(stray.slug);
      deleted++;
    }
  }

  console.log('\nDone.');
  console.log(`  ${created} created, ${updated} updated, ${deleted} deleted.`);
  if (missingMains.length) {
    console.log(`  Main categories not found: ${missingMains.join(', ')} - check migrations/01_create_tables.sql was run.`);
  }

  // Final tree, for a quick visual sanity check
  const { data: finalRows } = await supabase.from('categories').select('*').order('order_index', { ascending: true });
  console.log('\nFinal taxonomy:');
  for (const mainSlug of Object.keys(TAXONOMY)) {
    const main = finalRows.find((r) => r.slug === mainSlug && !r.parent_id);
    if (!main) continue;
    const children = finalRows
      .filter((r) => r.parent_id === main.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    console.log(`- ${main.name}: ${children.map((c) => c.name).join(', ') || '(none)'}`);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
