# Campus Activo

Plantilla Next.js para una agenda de actividades deportivas con espacios, encuentros e inscripciones.

Esta carpeta es un proyecto independiente. Puedes copiarla fuera de la carpeta principal, subirla a un repositorio propio y desplegarla en Vercel sin depender de los otros templates.

## Que incluye

- Next.js App Router con TypeScript strict.
- Tailwind CSS y componentes simples en espanol.
- Registro, inicio de sesion, recuperacion de contrasena y cierre de sesion.
- Supabase Auth con cookies SSR mediante `@supabase/ssr`.
- Supabase PostgreSQL con RLS, perfiles y roles `user` / `admin`.
- Builder.io para editar landing y secciones publicas.
- Componentes de dominio registrados para Builder: tarjetas, listado, detalle, formulario, filtros, selector de cancha, boton de inscripcion, cupos y estado.
- Migraciones SQL reproducibles en `supabase/migrations`.
- Pruebas unitarias para reglas de cupos.

## Requisitos

- Node.js 20.x. No uses Node 22, 24 o superior para instalar este template; el SDK de Builder.io usa una dependencia nativa que debe resolverse con Node 20.
- npm.
- Una cuenta de Supabase.
- Un espacio de Builder.io.
- Opcional: Supabase CLI y Vercel CLI.

## Primer arranque local

1. Instala dependencias.

```powershell
npm install
```

2. Copia las variables de entorno.

```powershell
cp .env.example .env.local
```

3. Completa `.env.local`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
NEXT_PUBLIC_BUILDER_API_KEY=tu_builder_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Importante: `NEXT_PUBLIC_SUPABASE_URL` debe ser solo la URL base. No pegues una URL con `/rest/v1/`.

4. Ejecuta el servidor.

```powershell
npm run dev
```

5. Abre `http://localhost:3000`.

Si Builder.io aun no esta configurado, la app mostrara una pagina local de respaldo.

## Configurar Supabase

1. Crea un proyecto nuevo en Supabase.
2. Copia la Project URL y la Publishable Key en `.env.local`.
3. Vincula el proyecto.

```powershell
npx supabase login
```

```powershell
npm run supabase:link
```

4. Ejecuta las migraciones.

```powershell
npm run supabase:push
```

5. Genera tipos.

```powershell
npm run supabase:types
```

6. En Supabase Auth configura:

- Site URL: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/confirm`
- Redirect URL Vercel: `https://tu-dominio.vercel.app/auth/confirm`

## Probar registro

1. Ve a `/registro`.
2. Usa un correo real o institucional.
3. Usa una contrasena de al menos 8 caracteres.
4. Revisa el correo de confirmacion.

En desarrollo, si Supabase rechaza el registro, el formulario muestra un detalle tecnico seguro con `status`, `code` y `message`. Ese detalle no contiene claves.

Consulta `docs/ERRORES_REGISTRO.md` si aparece un error.

## Configurar Builder.io

1. Crea un espacio nuevo en Builder.io.
2. Copia la API Key publica.
3. Pegala en `NEXT_PUBLIC_BUILDER_API_KEY`.
4. Crea una pagina con modelo `page`.
5. Usa `/` como URL para editar la landing.

Los componentes funcionales respetan RLS y no usan claves secretas.

1. Sube la carpeta a un repositorio privado de Git.
2. Importa el repositorio en Builder.io.
3. Agrega variables de entorno.

## Comandos utiles

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Despliegue en Vercel

1. Sube este proyecto a un repositorio Git.
2. Importalo en Vercel.
3. Confirma que Vercel use Node.js 20.x. El proyecto incluye `engines`, `.nvmrc` y `.node-version` para guiar esto.
4. Configura las mismas variables de `.env.local` en Vercel.
5. Agrega la URL final de Vercel en Supabase Auth Redirect URLs.
6. Despliega.

## Archivos importantes

- `src/actions`: acciones de servidor.
- `src/lib/supabase`: clientes Supabase SSR y browser.
- `src/components/domain`: componentes funcionales del dominio.
- `src/components/builder`: integracion con Builder.io.
- `supabase/migrations`: modelo de datos, RLS, funciones y triggers.
- `docs`: guias para profesor y estudiantes.
