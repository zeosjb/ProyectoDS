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

- Node.js 20.x. No uses Node 22, 24 o superior para instalar este template; el SDK de Builder.io usa una dependencia nativa que debe resolverse con Node 20.
- npm.
- Proyecto Supabase nuevo.
- Espacio Builder.io nuevo.

## Arranque local

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
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
npm.cmd run supabase:link
npm.cmd run supabase:push
npm.cmd run supabase:types
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

## Validacion

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## Despliegue

Sube el proyecto a GitHub, importalo en Vercel, confirma que use Node.js 20.x, copia variables de entorno y registra el dominio productivo en Supabase Auth. El proyecto incluye `engines`, `.nvmrc` y `.node-version` para guiar la version de Node.

## Archivos importantes

- `src/components/domain`: catalogo, solicitudes y panel admin.
- `src/actions`: acciones de servidor.
- `supabase/migrations`: tablas, RLS, Storage y funcion de aprobacion.
- `docs`: guias de uso y pruebas.
