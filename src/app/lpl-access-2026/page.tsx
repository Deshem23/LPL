import Image from 'next/image';
import { LoginForm } from '@/components/auth/login-form';

// Was its own hand-rolled form that POSTed to /api/auth/login - it had
// no Google sign-in button and no "forgot password" link, even though
// both already existed, fully wired, in LoginForm - that component just
// wasn't rendered anywhere. This renders it instead, so Google OAuth and
// password reset are actually reachable from the login screen.
//
// Two changes from the previous version:
// - The title used `text-secondary` for "Libres" - --secondary resolves
//   to rgb(240 241 243), an almost-white light gray meant for use as a
//   *background* fill (bg-secondary), not text. On this page's light
//   background that rendered as barely-visible white-on-white text. Now
//   uses the real logo image plus a single solid, theme-aware text
//   color, matching how the header/footer present the brand elsewhere.
// - The "Don't have an account? Sign up" link pointed at /register,
//   which is public self-signup - this app doesn't use that flow (users
//   are created by an admin via "Ajouter un utilisateur"), so the link
//   never belonged on the sign-in screen and has been removed.
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20">
            <Image
              src="/logo.png"
              alt="Les Pages Libres"
              fill
              sizes="80px"
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Les Pages Libres
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Connectez-vous à votre compte</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
