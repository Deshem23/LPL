import Link from 'next/link';

export default function CategoryNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold">Category Not Found</h1>
      <p className="mt-4 text-muted-foreground">
        The category you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
      >
        Return Home
      </Link>
    </div>
  );
}
