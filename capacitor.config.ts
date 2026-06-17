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
      // Custom URL scheme for OAuth deep-link callback (fallback flow).
      // Add this to Supabase Auth Redirect URLs:
      //   app.lovable.orbitmbbs://auth/callback
    },
    GoogleAuth: {
      // Replace with your Google Cloud OAuth 2.0 *Web* Client ID
      // (Create one in Google Cloud Console → Credentials → OAuth client → Web application).
      // The same Web Client ID must be set in Supabase → Auth → Providers → Google.
      // On Android you ALSO need a separate Android OAuth client whose SHA-1
      // matches your APK signing key — but only the Web Client ID goes here.
      clientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
