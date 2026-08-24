'use client';

import { useEffect, useState } from 'react';

interface ClientDateProps {
  className?: string;
}

export function ClientDate({ className = '' }: ClientDateProps) {
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    setDate(new Date().toLocaleString());
  }, []);

  return <span className={className} suppressHydrationWarning>{date || 'Loading...'}</span>;
}
