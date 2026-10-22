# RastreadorApp

Aplicación móvil para guardar perfiles y consultar el estado de encomiendas de distintos couriers. Los perfiles y las encomiendas se sincronizan con Supabase.

## Requisitos

- Node.js en una versión LTS y npm.
- Git.
- Un proyecto de Supabase para habilitar registro, inicio de sesión y sincronización.
- Para probar en un teléfono: Expo Go instalado. También se puede usar un emulador de Android; para el simulador de iOS se requiere macOS.

## Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. En el panel del proyecto, abre **SQL Editor**, pega el contenido de `supabase/migrations/20261020160000_profiles_and_packages.sql` y ejecútalo.
3. En **Project Settings → API**, copia la URL del proyecto y su clave publicable (anon).
4. En la carpeta del proyecto, crea `.env` a partir de la plantilla:

   **Windows PowerShell:**

   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux:**

   ```bash
   cp .env.example .env
   ```

5. Abre `.env` y completa los valores:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publicable
   ```

   No agregues espacios alrededor de `=`. Nunca uses una clave `service_role` ni subas el archivo `.env` a GitHub. La clave publicable/anon está diseñada para estar en la app; las políticas RLS de la migración limitan el acceso de cada usuario a sus propios datos.

6. Si el proyecto de Supabase requiere confirmar el correo, confirma la cuenta desde el email antes de iniciar sesión en la app.

## Instalar y ejecutar

Si se clona el proyecto desde GitHub, reemplaza `USUARIO` y `REPOSITORIO` por los valores de la URL:

```bash
git clone https://github.com/USUARIO/REPOSITORIO.git
cd REPOSITORIO
npm ci
```

Configura `.env` siguiendo los pasos anteriores y arranca Expo:

```bash
npm start
```

Escanea el código QR con Expo Go en el teléfono (ambos dispositivos deben poder comunicarse por la red local). En la terminal de Expo también puedes:

- Presionar `a` para abrir en un emulador de Android.
- Presionar `w` para ejecutar la versión web.

Comandos disponibles:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

Los perfiles locales anteriores se pueden importar desde **Perfiles** después de iniciar sesión. La protección PIN local no se transfiere; los datos sincronizados quedan asociados a la cuenta de Supabase.

## Estructura

```text
src/
  app/                 # Rutas de Expo Router
    (tabs)/            # Inicio, nueva encomienda y perfil
    auth.tsx           # Inicio de sesión y registro
    guest.tsx          # Seguimiento como invitado
  components/          # Componentes reutilizables
  contexts/            # Sesión y perfil activo
  lib/                 # Cliente Supabase y almacenamiento
  screens/             # Implementación de las pantallas
  services/couriers/   # Integraciones con couriers
  types/               # Tipos de dominio
supabase/migrations/   # Esquema de base de datos y políticas RLS
```
