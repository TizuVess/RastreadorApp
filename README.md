# RastreadorApp

Aplicación móvil para consultar y guardar el seguimiento de encomiendas. Los perfiles y pedidos de usuarios registrados se sincronizan con Supabase; también se puede consultar un envío como invitado sin guardar el resultado.

## Funcionalidades

- Registro e inicio de sesión.
- Creación, edición y eliminación de perfiles.
- Creación, edición, eliminación y consulta de encomiendas dentro de un perfil.
- Consulta automática del estado al guardar una encomienda y actualización desde el inicio.
- Consulta como invitado, sin cuenta y sin persistir el resultado.
- Integración de consulta directa con los endpoints públicos de **Blue Express**, **Pullman Cargo** y **Varmontt** (sin necesidad de API keys privadas).
- Importación opcional de perfiles locales heredados guardados en el dispositivo.

Blue Express, Pullman Cargo y Varmontt son los couriers integrados para consultar estados actualmente. Starken, Chilexpress, Correos de Chile y 17TRACK se pueden seleccionar y guardar, pero la consulta automática sigue pendiente. En los couriers sin integración, la app indica que la función estará disponible próximamente.

> Las consultas a Blue Express, Pullman Cargo y Varmontt usan endpoints públicos de sus sitios web que no están documentados formalmente y pueden cambiar. Si alguno modifica su estructura, la integración deberá actualizarse.

Starken, Chilexpress, Correos de Chile, TVP y 17TRACK requieren credenciales/API keys comerciales o están protegidos con verificación anti-bot (reCAPTCHA, hCaptcha, Cloudflare Turnstile o cifrado), por lo que no se integran directamente sin clave.

## Requisitos

- Node.js LTS y npm.
- Git.
- Un proyecto Supabase para registro, inicio de sesión y sincronización.
- Expo Go en un teléfono compatible o un emulador Android. Para el simulador iOS se requiere macOS.

## Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. En **SQL Editor**, ejecuta las migraciones de [`supabase/migrations`](./supabase/migrations) en orden cronológico. Esto crea los perfiles, encomiendas, políticas RLS y habilita el courier Starken en la base de datos.
3. En **Project Settings → API**, copia la URL del proyecto y la clave publicable (anon).
4. Crea un archivo llamado `.env` en la raíz del proyecto y agrega:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publicable
   ```

   Reemplaza ambos valores por los de tu proyecto. No uses una clave `service_role`, no agregues espacios alrededor de `=` y no subas `.env` a GitHub.

   La clave publicable está diseñada para usarse en la aplicación. Las políticas RLS de la migración restringen los datos de perfiles y encomiendas a cada usuario.

5. Si Supabase requiere confirmar el correo, confirma la cuenta antes de iniciar sesión.

La consulta como invitado a Blue Express, Pullman Cargo y Varmontt no necesita Supabase; el acceso y la sincronización de perfiles sí. Para guardar encomiendas de Pullman Cargo y Varmontt en perfiles autenticados, asegúrate de haber ejecutado todas las migraciones en [`supabase/migrations`](./supabase/migrations).

## Instalar y ejecutar

```bash
git clone https://github.com/TizuVess/RastreadorApp.git
cd RastreadorApp
npm ci
```

Configura `.env` como se indica arriba y luego inicia Expo:

```bash
npm start
```

Escanea el código QR con Expo Go; el teléfono y el computador deben poder comunicarse por la red local. En la terminal de Expo también puedes:

- Presionar `a` para abrir un emulador Android.
- Presionar `i` para abrir el simulador iOS (requiere macOS).
- Presionar `w` para abrir la aplicación web.

Comandos disponibles:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## Perfiles heredados

Si hay perfiles guardados localmente por una versión anterior, inicia sesión y usa **Importar perfiles locales** en la pantalla **Perfiles**. Se importan a Supabase para asociarlos a tu cuenta y sincronizarlos entre dispositivos. La protección PIN local anterior no se transfiere.

## Estructura

```text
src/
  app/                 # Rutas de Expo Router
    (tabs)/            # Inicio, nueva encomienda y cuenta
    auth.tsx           # Inicio de sesión y registro
    guest.tsx          # Consulta sin cuenta
    profiles.tsx       # Gestión de perfiles
  contexts/            # Sesión y perfil activo
  lib/                 # Cliente Supabase y almacenamiento
  navigation/          # Navegación principal
  screens/             # Pantallas de la aplicación
  services/couriers/   # Integraciones con couriers
  styles/              # Estilos compartidos
  types/               # Tipos de dominio
supabase/migrations/   # Esquema y políticas RLS
tests/                 # Pruebas unitarias (npm test)
```
