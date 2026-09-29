/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: (import("better-auth").User & { role?: string | null }) | null
    session: import("better-auth").Session | null
    locale: string
  }
}
