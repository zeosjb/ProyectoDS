# Pares Didacticos

Plantilla Next.js para un juego de memoria educativo con temas, dificultad, historial y ranking.

Esta carpeta es independiente y puede convertirse en un repositorio propio, con Supabase y Builder.io separados.

## Que incluye

- Next.js App Router con TypeScript strict.
- Tailwind CSS.
- Registro, login, recuperacion y cierre de sesion.
- Supabase Auth SSR con cookies.
- Tablas `game_themes`, `cards` y `game_sessions` con RLS.
- Dificultades `easy`, `medium` y `hard`.
- Juego visual en navegador.
- Validacion final del resultado en servidor mediante funcion PostgreSQL.
- Storage con bucket `card-images`.
- Builder.io con MemoryGame, ThemeSelector, DifficultySelector, GameResult, PlayerHistory y RankingTable.
- Pruebas unitarias para puntaje y resultados imposibles.

## Requisitos

- Node.js 20 o superior.
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

Si pegas por accidente una URL con `/rest/v1/`, el cliente intentara normalizarla, pero lo correcto es usar solo la URL base.

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

## Flujo de prueba

1. Registra un usuario.
2. Confirma el correo.
3. Inicia sesion.
4. Selecciona tema y dificultad.
5. Completa una partida.
6. Guarda el resultado.
7. Revisa historial y ranking.

La puntuacion se vuelve a validar en servidor para reducir resultados manipulados.

## Builder.io

El componente `MemoryGame` permite editar:

- `title`
- `themeId`
- `difficulty`
- `boardColor`
- `cardBackColor`
- `showTimer`
- `showMoves`
- `completionMessage`

La edicion visual no reemplaza las validaciones de servidor.

## Validacion

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## Despliegue

Sube el proyecto a GitHub, importalo en Vercel, configura variables de entorno y agrega el dominio final en Supabase Auth.

## Archivos importantes

- `src/components/domain`: juego, ranking e historial.
- `src/actions`: guardado validado.
- `supabase/migrations`: temas, cartas, sesiones, Storage y RLS.
- `docs`: guias para configuracion y pruebas.
