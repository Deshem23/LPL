// Minimal ambient shim so `import nodemailer from 'nodemailer'` type-checks.
// The `nodemailer` package doesn't bundle its own .d.ts and
// `@types/nodemailer` isn't installed - this is a lightweight stand-in
// (everything typed as `any`) rather than a hard dependency on that
// separate package. If richer autocomplete/typing is ever wanted, delete
// this file and run `npm install -D @types/nodemailer` instead.
declare module 'nodemailer' {
  const nodemailer: any;
  export default nodemailer;
}
