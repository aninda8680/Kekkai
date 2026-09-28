import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().optional(),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  ownerId: z.string().uuid(),
  createdAt: z.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const EnvironmentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export const SecretMetadataSchema = z.object({
  id: z.string().uuid(),
  environmentId: z.string().uuid(),
  key: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SecretMetadata = z.infer<typeof SecretMetadataSchema>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
