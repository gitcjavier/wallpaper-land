import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [tailwind(), react()],
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  }
});
