# Tablero Prisma

Plantilla Next.js para un tablero Kanban academico con integrantes, responsables, prioridades y vista de tabla.

Cada copia de esta carpeta funciona como repositorio independiente. No usa paquetes locales ni imports desde otros templates.

## Que incluye

- Next.js App Router con TypeScript strict.
- Tailwind CSS.
- Registro, login, recuperacion de contrasena y cierre de sesion.
- Supabase SSR Auth con cookies.
- Tablas `boards`, `board_members` y `tasks` protegidas con RLS.
- Estados `pending`, `in_progress`, `completed`.
- Prioridades `low`, `medium`, `high`.
- Drag and drop simple mas controles alternativos por botones/selectores.
- Builder.io con componentes de tablero, columna, tarjeta, formulario, modal, prioridad, responsable y estado.
- Pruebas unitarias para reglas de movimiento y prioridades.

## Requisitos

- Node.js >=22.0.0. El template usa la version activa del usuario o del deployment mientras cumpla este minimo.
- npm >=10.0.0.
- Proyecto Supabase independiente.
- Espacio Builder.io independiente.

## Arranque rapido

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

No uses una URL de Supabase con `/rest/v1/`; debe ser solo la URL base.

## Configurar Supabase

```powershell
npx supabase login
npm run supabase:link
npm run supabase:push
npm run supabase:types
```

Luego configura en Authentication:

- Site URL: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/confirm`
- Redirect URL produccion: `https://tu-dominio.vercel.app/auth/confirm`

## Flujo de prueba

1. Registra y confirma un usuario.
2. Inicia sesion.
3. Entra a `/dashboard`.
4. Crea o consulta tareas.
5. Cambia estado y prioridad.
6. Prueba la vista de tabla.

Si el registro falla, el formulario muestra en desarrollo `status`, `code` y `message` de Supabase. Revisa `docs/ERRORES_REGISTRO.md`.

## Builder.io

Builder puede editar landing, secciones publicas y componentes visuales del tablero. La seguridad no depende de ocultar botones: las consultas y mutaciones siguen protegidas por RLS.

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

## Despliegue en Vercel

1. Sube la carpeta a un repositorio Git.
2. Importa el repositorio en Vercel.
3. Usa la version de Node configurada en Vercel o en el deployment. El proyecto solo declara minimos en `engines`, asi que Node/npm mas nuevos son validos.
4. Agrega variables de entorno.
5. Agrega el dominio final como Redirect URL en Supabase.

## Archivos importantes

- `src/components/domain`: tablero y tareas.
- `src/actions`: acciones de servidor.
- `src/lib/supabase`: clientes Supabase.
- `supabase/migrations`: modelo, RLS y politicas.
- `docs`: guias paso a paso.
