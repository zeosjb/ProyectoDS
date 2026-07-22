"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, recoverPasswordAction, registerAction, type ActionState } from "@/actions/auth.actions";
import { Button, Field, Alert } from "@/components/ui";

const initialState: ActionState = { ok: false, message: "" };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Procesando..." : children}</Button>;
}

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <Alert tone={state.ok ? "success" : "error"}>
      <span>{state.message}</span>
      {state.details ? <code className="mt-2 block break-words text-xs">{state.details}</code> : null}
    </Alert>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  return (
    <form action={formAction} className="grid gap-4">
      <Feedback state={state} />
      <Field label="Correo" name="email" type="email" required autoComplete="email" />
      <Field label="Contrasena" name="password" type="password" required autoComplete="current-password" minLength={8} />
      <SubmitButton>Iniciar sesion</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  return (
    <form action={formAction} className="grid gap-4">
      <Feedback state={state} />
      <Field label="Nombre completo" name="fullName" required autoComplete="name" />
      <Field label="Correo" name="email" type="email" required autoComplete="email" />
      <Field label="Contrasena" name="password" type="password" required autoComplete="new-password" minLength={8} />
      <SubmitButton>Crear cuenta</SubmitButton>
    </form>
  );
}

export function RecoverPasswordForm() {
  const [state, formAction] = useActionState(recoverPasswordAction, initialState);
  return (
    <form action={formAction} className="grid gap-4">
      <Feedback state={state} />
      <Field label="Correo" name="email" type="email" required autoComplete="email" />
      <SubmitButton>Enviar recuperacion</SubmitButton>
    </form>
  );
}
