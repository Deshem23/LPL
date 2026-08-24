import type { SiteSettings } from '@/lib/services/settings-service';

// Shared password validator, driven by the Security tab in
// /admin/settings (password_min_length, require_special_chars,
// require_numbers, require_uppercase) - those fields were already saved
// to the DB correctly (see the note at the top of settings-service.ts)
// but nothing actually checked a password against them, so the "policy"
// was cosmetic. Used at every place a password is accepted from a user:
// self-registration (api/auth/register) and admin-created accounts
// (user-service.ts's createUser, via api/users). Password *changes* go
// straight through Supabase Auth client-side and aren't covered here.
export function validatePassword(
  password: string,
  settings: Pick<
    SiteSettings,
    'password_min_length' | 'require_special_chars' | 'require_numbers' | 'require_uppercase'
  >
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const minLength = settings.password_min_length || 8;

  if (!password || password.length < minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${minLength} caractères.`);
  }
  if (settings.require_uppercase && !/[A-Z]/.test(password || '')) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule.');
  }
  if (settings.require_numbers && !/[0-9]/.test(password || '')) {
    errors.push('Le mot de passe doit contenir au moins un chiffre.');
  }
  if (settings.require_special_chars && !/[^A-Za-z0-9]/.test(password || '')) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  return { valid: errors.length === 0, errors };
}
