// lib/auth/types.ts
export type FormState =
  | {
      error?: {
        username?: string[];
        password?: string[];
        confirmPassword?: string[];
        email?: string[];
        credentials?: string[];
      };
    }
  | undefined;