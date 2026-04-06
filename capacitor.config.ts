import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.silhouette.crm',
  appName: 'Silhouette CRM',
  webDir: 'public',
  server: {
    url: 'https://crmpmi.vercel.app/dashboard',
    cleartext: true
  }
};

export default config;
