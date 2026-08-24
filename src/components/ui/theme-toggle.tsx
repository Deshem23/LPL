'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-11 w-11 text-white dark:text-white hover:bg-white/10 dark:hover:bg-white/10">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      // text-white was already unconditional (this button only ever
      // renders on the fixed dark-navy header/mobile-menu background, in
      // both light and dark site theme), but adding the explicit
      // dark: variants too so it's unambiguous and can't be affected by
      // any future Tailwind purge/specificity change.
      className="h-11 w-11 text-white dark:text-white hover:bg-white/10 dark:hover:bg-white/10"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
