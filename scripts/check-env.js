#!/usr/bin/env node

console.log('🔍 Checking environment variables...\n');

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

let hasError = false;

required.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing: ${key}`);
    hasError = true;
  } else if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        console.error(`❌ Invalid ${key}: Must be HTTP/HTTPS URL`);
        hasError = true;
      } else {
        console.log(`✅ ${key}: ${value}`);
      }
    } catch {
      console.error(`❌ Invalid ${key}: Not a valid URL`);
      hasError = true;
    }
  } else {
    console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
  }
});

if (hasError) {
  console.log('\n❌ Please fix the errors above and restart the server.');
  process.exit(1);
} else {
  console.log('\n✅ All environment variables are valid!');
}
