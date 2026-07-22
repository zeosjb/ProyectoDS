# Errores de registro detectados

## 1. URL de Supabase con ruta `/rest/v1/`

Error observado:

```text
AuthApiError 404: Invalid path specified in request URL
```

Causa:

`NEXT_PUBLIC_SUPABASE_URL` tenia una URL de API REST:

```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co/rest/v1/
```

Arreglo:

Debe quedar solo la URL base del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
```

Ya fue corregido en `.env.local`. El codigo tambien normaliza la URL para quitar rutas accidentales.

## 2. Correo de prueba con dominio reservado

Error observado:

```text
email_address_invalid
```

Causa:

Supabase puede rechazar dominios reservados o de prueba como `example.com`.

Arreglo:

Usa un correo real/controlado por ti, idealmente institucional. Si el correo ya existe, usa inicio de sesion o recuperacion de contrasena.

## 3. Si aparece "Database error saving new user"

Causa probable:

El trigger que crea `profiles` no existe o fallo porque las migraciones no se aplicaron.

Arreglo:

```powershell
npm.cmd run supabase:link
npm.cmd run supabase:push
```

Luego confirma en Supabase SQL Editor que existe:

- `public.profiles`
- `public.handle_new_user()`
- trigger `on_auth_user_created`

## 4. Configuracion de redireccion

En Supabase Auth configura:

- Site URL: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/confirm`
- Redirect URL Vercel: `https://tu-dominio.vercel.app/auth/confirm`

## 5. Diagnostico visible en desarrollo

En desarrollo, los formularios muestran un detalle tecnico seguro con:

- `name`
- `status`
- `code`
- `message`

Ese detalle no incluye claves. Si vuelve a fallar el registro, copia esa linea para identificar la causa exacta.

Casos comunes:

- `signup_disabled`: activar registro por correo en Supabase Authentication.
- `email_provider_disabled`: activar Email provider.
- `weak_password`: usar contrasena de al menos 8 caracteres con letras y numeros.
- `over_email_send_rate_limit`: esperar unos minutos antes de reenviar correos.
- `invalid api key`: copiar nuevamente la Publishable Key del mismo proyecto.
