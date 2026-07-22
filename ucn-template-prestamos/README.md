# Inventario Aula

Plantilla Next.js para catalogo de recursos, solicitudes, aprobaciones, entregas y devoluciones.

La carpeta puede usarse como repositorio independiente, con su propio Supabase, Builder.io y despliegue en Vercel.

## Que incluye

- Next.js App Router con TypeScript strict.
- Tailwind CSS.
- Supabase Auth SSR.
- Roles `user` y `admin`.
- Catalogo de equipos o recursos.
- Solicitudes con estados `pending`, `approved`, `rejected`, `delivered`, `returned`, `overdue` y `cancelled`.
- Funcion PostgreSQL segura para aprobar sin superar disponibilidad.
- Storage con bucket `equipment-images`.
- Builder.io con componentes de catalogo, filtros, solicitud, tabla admin y botones de estado.
- Pruebas unitarias para disponibilidad y transiciones.

## Requisitos

- Node.js >=20.9.0. El template usa la version activa del usuario o del deployment mientras cumpla este minimo.
- npm >=10.0.0.
- Proyecto Supabase nuevo.
- Espacio Builder.io nuevo.

## Arranque local

```powershell
npm install
cp .env.example .env.local
npm run dev
```

Completa `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
NEXT_PUBLIC_BUILDER_API_KEY=tu_builder_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

La URL de Supabase debe ser la URL base del proyecto.

## Configurar Supabase

```powershell
npx supabase login
npm run supabase:link
npm run supabase:push
npm run supabase:types
```

Configura Auth:

- Site URL: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/confirm`
- Redirect URL Vercel: `https://tu-dominio.vercel.app/auth/confirm`

Para probar administracion, cambia el rol del usuario profesor a `admin` desde Supabase SQL Editor o Table Editor.

## Flujo de prueba

Usuario:

1. Registrarse y confirmar correo.
2. Iniciar sesion.
3. Ver catalogo.
4. Solicitar un recurso.
5. Cancelar solicitud pendiente.

Administrador:

1. Crear o editar recursos.
2. Aprobar o rechazar solicitudes.
3. Registrar entrega.
4. Registrar devolucion.

Si falla Auth, revisa `docs/ERRORES_REGISTRO.md`.

## Builder.io

Builder edita textos, secciones publicas, landing y componentes visuales. Las acciones administrativas siguen protegidas por RLS y funciones PostgreSQL.

1. Sube la carpeta a un repositorio privado de Git.
2. Importa el repositorio en Builder.io.
3. Agrega variables de entorno.

## Validacion

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Despliegue

Sube el proyecto a GitHub, importalo en Vercel, usa la version de Node configurada en el deployment, copia variables de entorno y registra el dominio productivo en Supabase Auth. El proyecto solo declara minimos en `engines`, asi que Node/npm mas nuevos son validos.

## Archivos importantes

- `src/components/domain`: catalogo, solicitudes y panel admin.
- `src/actions`: acciones de servidor.
- `supabase/migrations`: tablas, RLS, Storage y funcion de aprobacion.
- `docs`: guias de uso y pruebas.
