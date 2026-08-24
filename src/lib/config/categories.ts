export interface Category {
  slug: string;
  label: string;
  subcategories?: SubCategory[];
}

export interface SubCategory {
  slug: string;
  label: string;
}

export const categories: Category[] = [
  {
    slug: 'economie',
    label: 'Économie',
    subcategories: [
      { slug: 'finance', label: 'Finance' },
      { slug: 'entreprises', label: 'Entreprises' },
      { slug: 'investissement', label: 'Investissement' },
    ],
  },
  {
    slug: 'societe',
    label: 'Société',
    subcategories: [
      { slug: 'education', label: 'Éducation' },
      { slug: 'evenement', label: 'Événement' },
      { slug: 'opinion', label: 'Opinion' },
      { slug: 'environnement', label: 'Environnement' },
    ],
  },
  {
    slug: 'politique',
    label: 'Politique',
    subcategories: [
      { slug: 'nationale', label: 'Nationale' },
      { slug: 'internationale', label: 'Internationale' },
    ],
  },
  {
    slug: 'sante',
    label: 'Santé',
    subcategories: [
      { slug: 'bien-etre', label: 'Bien-être' },
      { slug: 'medecine', label: 'Médecine' },
    ],
  },
  {
    slug: 'international',
    label: 'International',
    subcategories: [
      { slug: 'afrique', label: 'Afrique' },
      { slug: 'europe', label: 'Europe' },
      { slug: 'ameriques', label: 'Amériques' },
      { slug: 'asie', label: 'Asie' },
      { slug: 'oceanie', label: 'Océanie' },
      { slug: 'moyen-orient', label: 'Moyen-Orient' },
    ],
  },
  {
    slug: 'technologie',
    label: 'Technologie',
    subcategories: [
      { slug: 'ia', label: 'Intelligence Artificielle' },
      { slug: 'innovation', label: 'Innovation' },
      { slug: 'recherche', label: 'Recherche' },
      { slug: 'gadgets', label: 'Gadgets' },
    ],
  },
  {
    slug: 'sport',
    label: 'Sport',
    subcategories: [
      { slug: 'football', label: 'Football' },
      { slug: 'basketball', label: 'Basketball' },
      { slug: 'tennis', label: 'Tennis' },
      { slug: 'general', label: 'Général' },
    ],
  },
  {
    slug: 'insolite',
    label: 'Insolite',
    subcategories: [
      { slug: 'curiosites', label: 'Curiosités' },
      { slug: 'viral', label: 'Viral' },
    ],
  },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find(cat => cat.slug === slug);
}

export function getSubcategory(categorySlug: string, subSlug: string): SubCategory | undefined {
  const category = getCategory(categorySlug);
  return category?.subcategories?.find(sub => sub.slug === subSlug);
}

export function getAllCategories(): Category[] {
  return categories;
}
