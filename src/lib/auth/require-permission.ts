import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/lib/auth/actions';
import { hasPermission, type UserRole } from '@/lib/auth/permissions';

/**
 * Shared route-handler auth guards.
 *
 * Both helpers return either the authenticated `{ user, role }` pair or
 * an already-built NextResponse (401/403) ready to be returned directly.
 * Every caller must check `if (auth instanceof NextResponse) return auth;`
 * before proceeding - this is what actually blocks the request, unlike
 * the old pattern of calling getCurrentUser() only to gate an audit-log
 * write while the mutation itself ran unconditionally.
 */

type AuthResult = {
  user: Awaited<ReturnType<typeof getCurrentUserWithRole>> extends infer T
    ? T extends { user: infer U }
      ? U
      : never
    : never;
  role: UserRole;
};

/** Require any authenticated user, regardless of role. */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const auth = await getCurrentUserWithRole();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return auth as AuthResult;
}

/** Require an authenticated user who also holds the given capability. */
export async function requirePermission(
  permission: Parameters<typeof hasPermission>[1]
): Promise<AuthResult | NextResponse> {
  const auth = await getCurrentUserWithRole();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(auth.role as UserRole, permission)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return auth as AuthResult;
}
