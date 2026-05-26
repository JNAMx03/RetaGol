// app.config.js — reemplaza app.json para soportar configuración dinámica.
// Durante un build de EAS, GOOGLE_SERVICES_JSON apunta al archivo subido como secreto.
// En desarrollo local, usa el archivo ./google-services.json si existe.

module.exports = {
  expo: {
    name: 'RetaGol',
    slug: 'RetaGol',
    version: '1.0.0',
    scheme: 'retagol',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.retagol.app',
      // En EAS Build, GOOGLE_SERVICES_JSON es la ruta al secreto de archivo.
      // En local, usa el archivo directamente si existe.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      // Hace que el teclado empuje el contenido hacia arriba en lugar de taparlo
      softwareKeyboardLayoutMode: 'pan',
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-secure-store',
      [
        'onesignal-expo-plugin',
        {
          mode: 'development',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '140ef772-27c5-45c1-9fb2-f5a9f4cb5db9',
      },
    },
  },
};
