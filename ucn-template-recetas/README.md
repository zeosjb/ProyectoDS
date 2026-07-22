# Recetario Base

Plantilla Next.js para una aplicacion colaborativa de preparaciones, ingredientes, favoritos e imagenes.

Esta carpeta es un proyecto independiente. Puedes copiarla, subirla a un repositorio propio y conectarla a un proyecto Supabase y Builder.io separados.

## Que incluye

- Next.js App Router con TypeScript strict.
- Tailwind CSS y formularios accesibles en espanol.
- Registro, inicio de sesion, recuperacion de contrasena y cierre de sesion.
- Supabase Auth con cookies SSR.
- Supabase PostgreSQL con RLS, perfiles y roles `user` / `admin`.
- Supabase Storage con bucket `recipe-images`.
- Builder.io para landing y paginas publicas.
- Componentes Builder: RecipeCard, RecipeGrid, RecipeDetail, RecipeForm, IngredientInput, IngredientFilter, ImageUploader, FavoriteButton y MyRecipes.
- Migraciones SQL y datos semilla.
- Pruebas unitarias para edicion e imagenes.

## Requisitos

- Node.js 20 o superior.
- npm.
- Proyecto Supabase nuevo.
- Espacio Builder.io nuevo.

## Primer arranque local

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Completa `.env.local` antes de probar autenticacion:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
NEXT_PUBLIC_BUILDER_API_KEY=tu_builder_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

La URL de Supabase debe ser la base del proyecto, sin `/rest/v1/`.

## Configurar Supabase

1. Crea el proyecto en Supabase.
2. Copia URL y Publishable Key.
3. Vincula y sube migraciones.

```powershell
npm.cmd run supabase:link
npm.cmd run supabase:push
npm.cmd run supabase:types
```

4. En Auth configura:

- Site URL: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/confirm`
- Redirect URL produccion: `https://tu-dominio.vercel.app/auth/confirm`

5. Verifica que exista el bucket `recipe-images`.

## Flujo recomendado de prueba

1. Registra un usuario con correo real.
2. Confirma el correo.
3. Inicia sesion.
4. Crea una receta.
5. Prueba una imagen PNG, JPG o WEBP de hasta 2 MB.
6. Marca una receta como favorita.

Si falla el registro, el formulario muestra una linea tecnica segura en desarrollo. Revisa `docs/ERRORES_REGISTRO.md`.

## Builder.io

1. Crea un espacio Builder.
2. Configura `NEXT_PUBLIC_BUILDER_API_KEY`.
3. Crea una pagina del modelo `page`.
4. Edita `/` o paginas publicas adicionales.

Los componentes muestran datos demo dentro del editor visual y mantienen la funcionalidad aunque cambies textos o estilos.

## Validacion

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## Despliegue

Sube este proyecto a GitHub, importalo en Vercel, agrega variables de entorno y registra el dominio final en Supabase Auth.

## Archivos importantes

- `src/components/domain`: recetas, filtros, favoritos e imagenes.
- `src/actions`: operaciones sensibles.
- `src/lib/supabase`: clientes SSR y browser.
- `supabase/migrations`: tablas, RLS, Storage y politicas.
- `docs`: instrucciones para profesor y estudiantes.
