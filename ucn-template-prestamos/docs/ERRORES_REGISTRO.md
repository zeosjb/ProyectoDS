# Errores de registro

Esta guia ayuda a diagnosticar problemas al crear cuentas con Supabase Auth.

## URL de Supabase incorrecta

Error comun:

```text
AuthApiError 404: Invalid path specified in request URL
```

La variable debe ser solo la URL base:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
```

No uses una URL con `/rest/v1/`.

## Correo rechazado

Codigo comun:

```text
email_address_invalid
```

Usa un correo real o institucional. Supabase puede rechazar dominios reservados como `example.com`.

## Registro deshabilitado

Codigos o mensajes comunes:

- `signup_disabled`
- `email_provider_disabled`

Arreglo:

En Supabase, entra a Authentication > Providers y activa Email. Revisa tambien que el registro de nuevos usuarios este permitido.

## Error al guardar perfil

Mensaje comun:

```text
Database error saving new user
```

Arreglo:

```powershell
npm.cmd run supabase:link
npm.cmd run supabase:push
```

Verifica que existan `public.profiles`, `public.handle_new_user()` y el trigger `on_auth_user_created`.

## Redirecciones

Configura en Supabase Auth:

- Site URL: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/confirm`
- Redirect URL Vercel: `https://tu-dominio.vercel.app/auth/confirm`

## Detalle visible en desarrollo

En desarrollo, el formulario puede mostrar:

```text
name=... | status=... | code=... | message=...
```

Ese detalle no contiene claves.
