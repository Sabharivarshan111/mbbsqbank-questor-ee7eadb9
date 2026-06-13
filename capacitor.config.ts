import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.89df4dbc89e64e44a7b176b9de94066e',
  appName: 'mbbsqbank-questor',
  webDir: 'dist',
  server: {
    url: 'https://89df4dbc-89e6-4e44-a7b1-76b9de94066e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    App: {
      // Custom URL scheme for OAuth deep-link callback
      // Add this to Supabase Auth Redirect URLs:
      //   app.lovable.orbitmbbs://auth/callback
    },
  },
};

export default config;
