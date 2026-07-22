import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo valido."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres.")
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "Ingresa tu nombre.")
});

export const recoverPasswordSchema = z.object({
  email: z.string().email("Ingresa un correo valido.")
});
