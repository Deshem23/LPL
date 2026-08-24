import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendTestEmail } from '@/lib/email/mailer';

// Always run fresh - this hits the live SMTP server on every call, so
// there's nothing here that should ever be cached.
export const dynamic = 'force-dynamic';

// Backs the "Tester" button in Paramètres > Email. Before this route
// existed, that button was a hardcoded stub that always reported
// "Aucun service d'envoi d'email n'est encore connecté à ces
// identifiants SMTP" regardless of what was actually saved - so a
// correctly-configured Gmail/SMTP account looked identically broken to
// a genuinely missing one. This actually attempts a send and reports
// the real outcome, using the same admin-only auth pattern as the
// settings PATCH handler in api/admin/settings/route.ts.
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent tester la configuration email.' },
        { status: 403 }
      );
    }

    const result = await sendTestEmail();

    if (!result.sent) {
      const message =
        result.reason === 'smtp_not_configured'
          ? "Hôte, port, utilisateur et mot de passe SMTP doivent tous être renseignés avant de tester."
          : result.error || "L'envoi a échoué. Vérifiez vos identifiants SMTP.";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true, to: result.to });
  } catch (error) {
    console.error('Error testing email settings:', error);
    return NextResponse.json({ error: 'Le test a échoué de façon inattendue.' }, { status: 500 });
  }
}
