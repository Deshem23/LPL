import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-secondary/5 p-4">
      <div className="text-center max-w-md">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-3xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/lpl-access-2026">Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
