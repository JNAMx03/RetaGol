# V0 — Configuración del Proyecto desde Cero

Este documento describe paso a paso cómo se creó y configuró el proyecto RetaGol, desde la instalación del entorno hasta tener la primera pantalla corriendo. Es la guía de referencia si en algún momento hay que replicar el setup o incorporar a alguien nuevo al proyecto.

---

## 1. Requisitos del sistema

Antes de comenzar, asegurarse de tener instalado:

| Herramienta | Versión mínima | Enlace |
|---|---|---|
| Node.js | 18 LTS | https://nodejs.org |
| Git | 2.x | https://git-scm.com |
| VS Code | 1.85+ | https://code.visualstudio.com |
| Android Studio | 2023+ | https://developer.android.com/studio |
| Xcode (solo macOS) | 15+ | App Store de macOS |
| Expo Go (móvil) | última | App Store / Google Play |

### Verificar instalaciones
```bash
node -v        # debe mostrar v18.x.x o superior
npm -v         # debe mostrar 10.x.x o superior
git --version  # debe mostrar 2.x.x o superior
```

---

## 2. Cuentas necesarias

Crear cuentas antes de empezar el desarrollo:

| Servicio | Para qué | URL |
|---|---|---|
| **GitHub** | Repositorio de código | https://github.com |
| **Expo** | Build y distribución (EAS) | https://expo.dev |
| **Supabase** | Backend (DB + Auth) — necesario para V1 backend | https://supabase.com |
| **Figma** | Diseño y wireframes | https://figma.com |
| **API-Football** | Datos de partidos reales — plan gratuito para arrancar | https://rapidapi.com/api-sports/api/api-football |
| **Sentry** | Monitoreo de errores | https://sentry.io |

---

## 3. Extensiones de VS Code recomendadas

Instalar estas extensiones para una experiencia de desarrollo óptima:

```
ES7+ React/Redux/React-Native snippets   → dsznajder.es7-react-js-snippets
TypeScript + JavaScript                  → microsoft.vscode-ts-javascript
Prettier - Code formatter                → esbenp.prettier-vscode
ESLint                                   → dbaeumer.vscode-eslint
GitLens                                  → eamodio.gitlens
React Native Tools                       → msjsdiag.vscode-react-native
Tailwind CSS IntelliSense                → bradlc.vscode-tailwindcss (para NativeWind en V2)
```

Configuración de VS Code recomendada (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "typescriptreact"
  }
}
```

---

## 4. Creación del proyecto Expo

### 4.1 Crear el proyecto con TypeScript

```bash
npx create-expo-app@latest RetaGol --template blank-typescript
cd RetaGol
```

### 4.2 Verificar que el proyecto corre

```bash
npm start
```

Escanear el QR con Expo Go en el celular, o presionar `a` para Android / `i` para iOS (simuladores).

### 4.3 Inicializar el repositorio Git

```bash
git init
git add .
git commit -m "Initial commit: proyecto Expo base"
```

Crear repositorio en GitHub y conectarlo:
```bash
git remote add origin https://github.com/tu-usuario/RetaGol.git
git branch -M main
git push -u origin main
```

---

## 5. Instalación de dependencias

Instalar todas las dependencias de la V1 de una vez:

```bash
# Navegación
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Persistencia local
npx expo install @react-native-async-storage/async-storage

# Iconos (opcional — en V1 se usan emojis como alternativa)
npx expo install @expo/vector-icons
```

### Para V1 con Supabase (cuando se integre el backend):
```bash
npx expo install @supabase/supabase-js
npx expo install expo-secure-store   # para tokens de auth seguros
```

### package.json resultante (dependencias clave)
```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "react": "18.3.1",
    "react-native": "0.81.0",
    "@react-navigation/native": "^7.x",
    "@react-navigation/native-stack": "^7.x",
    "@react-navigation/bottom-tabs": "^7.x",
    "react-native-screens": "^4.x",
    "react-native-safe-area-context": "^4.x",
    "@react-native-async-storage/async-storage": "^2.x"
  }
}
```

---

## 6. Estructura de carpetas del proyecto (V1)

La estructura que se creó manualmente después de iniciar el proyecto:

```
RetaGol/
├── assets/                    # Imágenes, splash, íconos de la app
│   ├── icon.png
│   ├── splash-icon.png
│   └── adaptive-icon.png
│
├── components/                # Componentes reutilizables
│   ├── MatchCard.tsx          # Tarjeta de partido con inputs
│   └── PoolCard.tsx           # Tarjeta de polla en la lista
│
├── context/                   # Estado global
│   └── AppContext.tsx         # Contexto único con useApp() hook
│
├── navigation/                # Configuración de navegadores
│   ├── AppNavigator.tsx       # Stack raíz (auth vs app)
│   ├── MainTabsNavigator.tsx  # 5 tabs principales
│   └── PoolTabsNavigator.tsx  # 4 tabs de detalle de polla
│
├── screens/                   # Pantallas de la app
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   └── app/
│       ├── HomeScreen.tsx
│       ├── ExplorarScreen.tsx
│       ├── TiendaScreen.tsx
│       ├── RankingScreen.tsx
│       ├── PerfilScreen.tsx
│       ├── CreatePoolScreen.tsx
│       ├── JoinPoolScreen.tsx
│       └── pool/
│           ├── PredictionsScreen.tsx
│           ├── ResultsScreen.tsx
│           ├── StandingsScreen.tsx
│           └── InfoScreen.tsx
│
├── utils/                     # Funciones utilitarias
│   └── scoring.ts             # Lógica de puntuación compartida
│
├── App.tsx                    # Punto de entrada
├── app.json                   # Configuración de Expo
├── tsconfig.json              # Configuración TypeScript
├── package.json
│
├── CLAUDE.md                  # Guía para Claude Code
├── ARQUITECTURA_RETAGOL.md    # Arquitectura completa del producto
├── V0_SETUP.md                # Este documento
├── V1_PLAN.md                 # Plan detallado de V1
├── V1_5_PLAN.md               # Plan de V1.5
├── V2_0_PLAN.md               # Plan de V2.0
├── V2_5_PLAN.md               # Plan de V2.5
└── V3_0_PLAN.md               # Plan de V3.0
```

---

## 7. Configuración de TypeScript

El archivo `tsconfig.json` generado por Expo con strict mode habilitado:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 8. Configuración de app.json

Configuración base de Expo para la V1:

```json
{
  "expo": {
    "name": "RetaGol",
    "slug": "retagol",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#2563EB"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.tudominio.retagol"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2563EB"
      },
      "package": "com.tudominio.retagol"
    },
    "extra": {
      "eas": {
        "projectId": "TU-PROJECT-ID-DE-EXPO"
      }
    }
  }
}
```

---

## 9. Punto de entrada (App.tsx)

El archivo `App.tsx` simplemente envuelve todo en los providers necesarios:

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from './context/AppContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}
```

---

## 10. Flujo de navegación implementado

```
AppNavigator (NativeStack)
│
├── [!isLogged] Login
│     └── Register
│
└── [isLogged] MainTabs (BottomTabs)
      ├── Home         ← FlatList de pollas + botones crear/unirse
      ├── Explorar     ← Placeholder V1.5
      ├── Tienda       ← Placeholder V2.0
      ├── Ranking      ← Placeholder V2.5
      └── Perfil       ← Stats + logout

      + sobre los tabs (push full-screen, oculta tab bar):
      ├── CreatePool   ← Formulario de nueva polla
      ├── JoinPool     ← Input de código de acceso
      └── PoolDetail (BottomTabs anidados)
            ├── Predicciones
            ├── Resultados
            ├── Clasificación
            └── Info
```

---

## 11. Variables de entorno

Para cuando se integre Supabase, crear el archivo `.env` en la raíz:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> Las variables con prefijo `EXPO_PUBLIC_` son accesibles en el cliente. Nunca incluir claves secretas aquí — usar Supabase Edge Functions para lógica con claves privadas.

Agregar `.env` al `.gitignore`:
```
.env
.env.local
.env*.local
```

---

## 12. Comandos de desarrollo habituales

```bash
npm start              # Inicia Metro (modo interactivo)
npm run android        # Corre en emulador/dispositivo Android
npm run ios            # Corre en simulador iOS (solo macOS)
npm run web            # Corre en navegador (debug rápido)

# Limpiar caché si algo falla
npx expo start --clear

# Instalar dependencia de forma segura con Expo
npx expo install nombre-del-paquete

# Ver logs del dispositivo
npx expo start --tunnel   # útil si el dispositivo físico no conecta por LAN
```

---

## 13. Git Flow usado en el proyecto

```
main          → código estable, lo que se publica
develop       → integración de features activas
feature/xxx   → cada funcionalidad nueva en su propia rama
hotfix/xxx    → correcciones urgentes sobre main
```

Ejemplo de flujo para una feature:
```bash
git checkout develop
git checkout -b feature/supabase-auth
# ... desarrollo ...
git add .
git commit -m "feat: integrar Supabase Auth con email/password"
git checkout develop
git merge feature/supabase-auth
git branch -d feature/supabase-auth
```

---

## 14. Estado al finalizar V0

Al terminar esta fase de setup, el proyecto tiene:

- Proyecto Expo funcionando en iOS, Android y Web
- TypeScript en modo strict
- Estructura de carpetas definida
- Navegación completa implementada (auth + tabs + pool detail)
- Estado global con Context API + AsyncStorage
- Todas las pantallas de V1 con datos mock (sin backend)
- Sistema de puntuación implementado (`utils/scoring.ts`)
- Cero errores de TypeScript
- Repositorio Git limpio en GitHub

**Siguiente paso:** Ver `V1_PLAN.md` para la integración del backend real.
