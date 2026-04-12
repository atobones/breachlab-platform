import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

describe("auth validation", () => {
  describe("registerSchema", () => {
    it("accepts a valid input", () => {
      const result = registerSchema.safeParse({
        username: "ghost_op",
        email: "a@b.io",
        password: "hunter2hunter2",
      });
      expect(result.success).toBe(true);
    });

    it("rejects username with spaces", () => {
      const result = registerSchema.safeParse({
        username: "ghost op",
        email: "a@b.io",
        password: "hunter2hunter2",
      });
      expect(result.success).toBe(false);
    });

    it("rejects username shorter than 3", () => {
      expect(
        registerSchema.safeParse({
          username: "ab",
          email: "a@b.io",
          password: "hunter2hunter2",
        }).success
      ).toBe(false);
    });

    it("rejects password shorter than 12", () => {
      expect(
        registerSchema.safeParse({
          username: "ghost_op",
          email: "a@b.io",
          password: "short",
        }).success
      ).toBe(false);
    });

    it("rejects malformed email", () => {
      expect(
        registerSchema.safeParse({
          username: "ghost_op",
          email: "not-an-email",
          password: "hunter2hunter2",
        }).success
      ).toBe(false);
    });

    it("normalizes email to lowercase", () => {
      const result = registerSchema.safeParse({
        username: "ghost_op",
        email: "AliCe@Example.IO",
        password: "hunter2hunter2",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.email).toBe("alice@example.io");
    });
  });

  describe("loginSchema", () => {
    it("accepts username + password", () => {
      const result = loginSchema.safeParse({
        username: "ghost_op",
        password: "hunter2hunter2",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("resetPasswordSchema", () => {
    it("requires password >= 12", () => {
      expect(
        resetPasswordSchema.safeParse({ password: "short" }).success
      ).toBe(false);
      expect(
        resetPasswordSchema.safeParse({ password: "twelvechars1" }).success
      ).toBe(true);
    });
  });
});
