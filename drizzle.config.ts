import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/auth/schema.ts',
  dialect: 'sqlite',
  out: './migrations',
});
