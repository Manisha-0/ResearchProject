"use client";

import { create } from "zustand";

import {
  getCurrentUser,
  login,
} from "@/lib/auth-api";

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-storage";

import type {
  CurrentUser,
} from "@/types/auth";

type AuthStore = {
  user: CurrentUser | null;

  token: string | null;

  isLoading: boolean;

  isAuthenticated: boolean;

  error: string | null;

  loginUser: (
    email: string,
    password: string
  ) => Promise<CurrentUser>;

  restoreSession:
    () => Promise<void>;

  logout: () => void;

  clearError: () => void;
};

export const useAuthStore =
  create<AuthStore>(
    (set) => ({
      user: null,

      token: null,

      isLoading: true,

      isAuthenticated:
        false,

      error: null,

      loginUser: async (
        email,
        password
      ) => {
        set({
          isLoading: true,

          error: null,
        });

        try {
          const loginResponse =
            await login({
              email:
                email
                  .trim()
                  .toLowerCase(),

              password,
            });

          const token =
            loginResponse.access_token;

          setAccessToken(
            token
          );

          const user =
            await getCurrentUser(
              token
            );

          set({
            user,

            token,

            isAuthenticated:
              true,

            isLoading: false,

            error: null,
          });

          return user;
        } catch (error) {
          clearAccessToken();

          const message =
            error instanceof Error
              ? error.message
              : "Unable to sign in.";

          set({
            user: null,

            token: null,

            isAuthenticated:
              false,

            isLoading: false,

            error: message,
          });

          throw error;
        }
      },

      restoreSession:
        async () => {
          const token =
            getAccessToken();

          if (!token) {
            set({
              user: null,

              token: null,

              isAuthenticated:
                false,

              isLoading: false,

              error: null,
            });

            return;
          }

          set({
            isLoading: true,

            error: null,
          });

          try {
            const user =
              await getCurrentUser(
                token
              );

            set({
              user,

              token,

              isAuthenticated:
                true,

              isLoading: false,

              error: null,
            });
          } catch {
            clearAccessToken();

            set({
              user: null,

              token: null,

              isAuthenticated:
                false,

              isLoading: false,

              error: null,
            });
          }
        },

      logout: () => {
        clearAccessToken();

        set({
          user: null,

          token: null,

          isAuthenticated:
            false,

          isLoading: false,

          error: null,
        });
      },

      clearError: () => {
        set({
          error: null,
        });
      },
    })
  );