import nodemailer from 'nodemailer';
import { getSiteSettings } from '@/lib/services/settings-service';

export interface SendMailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export type SendMailResult =
  | { sent: true }
  | { sent: false; reason: 'notifications_disabled' | 'smtp_not_configured' | 'send_failed' };

// Shared by sendMail() and sendTestEmail() - builds the nodemailer
// transporter plus the resolved from-name/from-email from Settings >
// Email. Returns null when the 4 required SMTP fields aren't all set.
function buildTransporter(settings: Awaited<ReturnType<typeof getSiteSettings>>) {
  if (!settings.smtp_host || !settings.smtp_port || !settings.smtp_user || !settings.smtp_password) {
    return null;
  }

  const port = parseInt(settings.smtp_port, 10) || 587;
  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port,
    // 465 is the implicit-TLS SMTPS port; everything else (587, 25, ...)
    // uses STARTTLS instead, which nodemailer negotiates automatically
    // when `secure` is false.
    secure: port === 465,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_password,
    },
  });

  const fromName = settings.from_name || settings.site_name || 'Les Pages Libres';
  const fromEmail = settings.from_email || settings.smtp_user;

  return { transporter, fromName, fromEmail };
}

// Thin wrapper around nodemailer, configured from Settings > Email
// (smtp_host/port/user/password, from_email/from_name, and the
// "Notifications activées" toggle). Those fields were already saved to
// the DB correctly (see the note at the top of settings-service.ts) but
// nothing in the app ever actually sent mail through them until now -
// this is what the contact form (api/contact/route.ts) and the
// admin-created-user welcome email (api/users/route.ts) send through.
//
// Fails soft: returns {sent:false, reason} instead of throwing when
// notifications are off or SMTP isn't fully configured, so a call site
// can still do its main job (save a message, create the account) even
// if the email leg can't go out.
export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const settings = await getSiteSettings();

  if (!settings.enable_notifications) {
    return { sent: false, reason: 'notifications_disabled' };
  }
  const built = buildTransporter(settings);
  if (!built) {
    console.warn('sendMail: SMTP is not fully configured in Settings > Email - skipping send.');
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    await built.transporter.sendMail({
      from: `"${built.fromName}" <${built.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      replyTo: params.replyTo,
    });
    return { sent: true };
  } catch (error) {
    console.error('sendMail: failed to send email', error);
    return { sent: false, reason: 'send_failed' };
  }
}

export type SendTestEmailResult =
  | { sent: true; to: string }
  | { sent: false; reason: 'smtp_not_configured' | 'send_failed'; error?: string };

// Backs the "Tester" button in Paramètres > Email. That button used to
// be a hardcoded stub - it always showed "Aucun service d'envoi d'email
// n'est encore connecté à ces identifiants SMTP" no matter what was
// entered, which made a correctly-configured SMTP account look broken.
// This actually builds a transporter from the just-saved settings and
// sends a real email to the configured "from" address, so the admin
// gets a real pass/fail (and the real SMTP error message on failure)
// instead of a canned one. Deliberately ignores the "Notifications
// activées" toggle - an admin testing their credentials while
// notifications are still off should still get a real answer.
export async function sendTestEmail(): Promise<SendTestEmailResult> {
  const settings = await getSiteSettings();
  const built = buildTransporter(settings);
  if (!built) {
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const to = settings.from_email || settings.smtp_user!;

  try {
    await built.transporter.sendMail({
      from: `"${built.fromName}" <${built.fromEmail}>`,
      to,
      subject: 'Email de test - Les Pages Libres',
      text:
        'Ceci est un email de test envoye depuis Parametres > Email. ' +
        'Si vous recevez ce message, votre configuration SMTP fonctionne correctement.',
      html:
        '<p>Ceci est un email de test envoyé depuis <strong>Paramètres&nbsp;&gt;&nbsp;Email</strong>.</p>' +
        '<p>Si vous recevez ce message, votre configuration SMTP fonctionne correctement.</p>',
    });
    return { sent: true, to };
  } catch (error: any) {
    console.error('sendTestEmail: failed to send test email', error);
    return { sent: false, reason: 'send_failed', error: error?.message };
  }
}
