/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
          dark: "rgb(var(--primary-dark) / <alpha-value>)",
          light: "rgb(var(--primary-light) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        // Custom dark colors for better balance
        'dark-bg': {
          50: '#f8f9fa',
          100: '#f1f2f4',
          200: '#e4e5e8',
          300: '#c7c9ce',
          400: '#a3a6ae',
          500: '#7f838c',
          600: '#5c6068',
          700: '#3d4046',
          800: '#25272b',
          900: '#141518',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "slide-in": {
          from: { transform: "translateY(-10px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: 0 },
          to: { transform: "scale(1)", opacity: 1 },
        },
        // Marquee scroll for the breaking-news bar and the Annonce ticker
        // (header.tsx) - both already used the "animate-scroll" class, but
        // no "scroll" keyframe/animation was ever defined, so neither bar
        // actually scrolled; it just sat static.
        //
        // Switched from `transform: translateX(0 -> -50%)` on a
        // doubled-content track to `left: 100% -> -100%` on a single,
        // absolutely-positioned track. translateX(-50%) moves the track by
        // 50% of ITS OWN (doubled) width - if the actual ticker content
        // (breaking headlines / ad text) was short, that's a small pixel
        // distance no matter how wide the bar itself is, so the motion
        // barely covered any of the bar and looked stuck in the middle
        // instead of sweeping across it. `left` on an absolutely
        // positioned element is a percentage of the CONTAINING block's
        // width instead, so 100% -> -100% always sweeps fully from
        // off-screen right to off-screen left across the whole bar, no
        // matter how short or long the content is.
        scroll: {
          "0%": { left: "100%" },
          "100%": { left: "-100%" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        // Used by the site-wide loading screen (app/loading.tsx) - a
        // stack of three "pages" flipping in sequence, like a newspaper
        // being leafed through, instead of a plain spinner.
        "page-flip": {
          "0%, 100%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(-160deg)" },
        },
        "loading-bar": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(10%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        // Base duration for the header's "BREAKING" news marquee
        // (header.tsx). The "Annonce" ad ticker uses this same "scroll"
        // keyframe but overrides the duration inline (animationDuration:
        // '28s') to run slower than this - see the ad ticker's own
        // comment in header.tsx. Bumped from 14s to 26s: once the
        // breaking-news bar was actually rendering again, 14s read as too
        // fast to comfortably read the headlines while they swept past.
        scroll: "scroll 26s linear infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "page-flip": "page-flip 1.8s ease-in-out infinite",
        "loading-bar": "loading-bar 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"), // Added for rich text editor
  ],
};
