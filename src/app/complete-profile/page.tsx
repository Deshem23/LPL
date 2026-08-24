import { Metadata } from 'next';
import Image from 'next/image';
import { CompleteProfileForm } from '@/components/auth/complete-profile-form';

export const metadata: Metadata = {
  title: 'Complete your account - Les Pages Libres',
  description: 'Set your password and complete your author profile.',
};

export default function CompleteProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {/* Same fix as the /lpl-access-2026 login page: was missing the
              logo entirely, and "Libres" used text-secondary, which
              resolves to rgb(240 241 243) - an almost-white light gray
              meant for *background* fills (bg-secondary), not text. On
              this page's light gradient background that rendered as
              barely-visible white-on-white. Now uses the real logo image
              plus text-primary-dark (a real dark blue already defined in
              the design system) for "Libres" instead. */}
          <div className="relative mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20">
            <Image
              src="/logo.png"
              alt="Les Pages Libres"
              fill
              sizes="80px"
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold">
            <span className="text-primary">Les Pages</span>
            <span className="text-primary-dark"> Libres</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome! Set a password only you know, and confirm your author profile before continuing.
          </p>
        </div>
        <CompleteProfileForm />
      </div>
    </div>
  );
}
