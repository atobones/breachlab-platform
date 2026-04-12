import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username may only contain letters, numbers, and underscores"
  )
  .transform((s) => s.toLowerCase());

const emailSchema = z
  .email("Invalid email address")
  .transform((s) => s.toLowerCase());

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(256, "Password must be at most 256 characters");

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const totpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
