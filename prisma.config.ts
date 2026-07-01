import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // KITA TEMPEL LANGSUNG LINK-NYA DI SINI (Pastikan pakai tanda kutip ya!)
    url: "postgresql://neondb_owner:npg_5TQHV7XRtKcj@ep-quiet-poetry-ad8zhqkl-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" 
  },
});