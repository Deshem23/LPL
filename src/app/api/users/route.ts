import { NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUserRole, deleteUser, getUserById } from '@/lib/services/user-service';
import { logAction } from '@/lib/services/audit-service';
import { getSiteSettings } from '@/lib/services/settings-service';
import { validatePassword } from '@/lib/auth/password-policy';
import { sendMail } from '@/lib/email/mailer';
import { requirePermission } from '@/lib/auth/require-permission';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requirePermission('canViewUsers');
    if (auth instanceof NextResponse) return auth;

    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission('canCreateUser');
    if (auth instanceof NextResponse) return auth;
    const actor = auth.user;

    const body = await request.json();
    const { email, password, name, role, bio, role_title, twitter, linkedin, website, avatar_url } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Settings > Security's password policy applies here too - an admin
    // setting a new user's temporary password should be held to the same
    // rule as self-registration, not just the browser form's own minlength.
    const settings = await getSiteSettings();
    const passwordCheck = validatePassword(password, settings);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.errors.join(' ') },
        { status: 400 }
      );
    }

    const result = await createUser({
      email,
      password,
      name,
      role: role || 'contributor',
      bio,
      role_title,
      twitter,
      linkedin,
      website,
      avatar_url,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logAction({
      userId: actor.id,
      action: 'user.create',
      entityType: 'user',
      entityId: result.user?.id,
      details: { email, name, role: role || 'contributor' },
    });

    // Best-effort welcome email with the temporary password the admin
    // just set - never blocks or fails account creation if it can't send
    // (no SMTP configured yet, notifications off, etc. - see
    // sendMail()'s "fails soft" behavior).
    sendMail({
      to: email,
      subject: `${settings.site_name || 'Les Pages Libres'} - Votre compte a été créé`,
      text: `Bonjour ${name},\n\nUn compte a été créé pour vous sur ${settings.site_name || 'Les Pages Libres'}.\n\nEmail : ${email}\nMot de passe temporaire : ${password}\n\nVous devrez le changer lors de votre première connexion.`,
      html: `<p>Bonjour ${name},</p><p>Un compte a été créé pour vous sur <strong>${settings.site_name || 'Les Pages Libres'}</strong>.</p><p>Email : ${email}<br/>Mot de passe temporaire : <strong>${password}</strong></p><p>Vous devrez le changer lors de votre première connexion.</p>`,
    }).catch((err) => console.error('Welcome email failed to send:', err));

    return NextResponse.json({
      success: true,
      user: result.user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requirePermission('canManageRoles');
    if (auth instanceof NextResponse) return auth;
    const actor = auth.user;

    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (role) {
      const result = await updateUserRole(userId, role);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      logAction({
        userId: actor.id,
        action: 'user.role_change',
        entityType: 'user',
        entityId: userId,
        details: { role },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePermission('canDeleteUser');
    if (auth instanceof NextResponse) return auth;
    const actor = auth.user;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Same guard as DELETE /api/users/[id] - this query-param variant
    // (used by the users admin page's row menu and now its bulk-delete
    // action too) never had it, so selecting yourself among several
    // users to bulk-delete would have signed you out mid-request.
    if (userId === actor.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
        { status: 400 }
      );
    }

    const existing = await getUserById(userId);

    const result = await deleteUser(userId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logAction({
      userId: actor.id,
      action: 'user.delete',
      entityType: 'user',
      entityId: userId,
      details: existing ? { email: existing.email, name: existing.name } : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
