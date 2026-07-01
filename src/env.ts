import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  // Treat unset-but-present ("KEY=") env vars the same as fully absent ones,
  // so optional integrations left blank in .env don't fail validation.
  emptyStringAsUndefined: true,
  server: {
    DATABASE_URL: z.string().trim().min(1),
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: z.string().trim().min(1),

    // Solvro Auth (self-hosted Keycloak) — OIDC login via better-auth generic-oauth.
    // Left optional: the plugin is only registered when all three are set.
    OIDC_ISSUER_URL: z.url().optional(),
    OIDC_CLIENT_ID: z.string().trim().min(1).optional(),
    OIDC_CLIENT_SECRET: z.string().trim().min(1).optional(),

    // USOS login via better-auth-usos. Optional for the same reason as above.
    USOS_BASE_URL: z.url().optional(),
    USOS_CONSUMER_KEY: z.string().trim().min(1).optional(),
    USOS_CONSUMER_SECRET: z.string().trim().min(1).optional(),
    USOS_EMAIL_DOMAIN: z.string().trim().min(1).optional(),

    // GitHub org integration (member/repo/team automation) — wired up starting Phase 1/2.
    GITHUB_APP_ID: z.string().trim().min(1).optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().trim().min(1).optional(),
    GITHUB_ORG: z.string().trim().min(1).optional(),
    // Verifies POST /api/webhooks/github requests (set the same value as the
    // GitHub App's "Webhook secret").
    GITHUB_WEBHOOK_SECRET: z.string().trim().min(1).optional(),

    // Discord automation (invites, role sync) — wired up starting Phase 1.
    DISCORD_BOT_TOKEN: z.string().trim().min(1).optional(),
    DISCORD_GUILD_ID: z.string().trim().min(1).optional(),
    // Channel the bot creates onboarding invite links for.
    DISCORD_INVITE_CHANNEL_ID: z.string().trim().min(1).optional(),

    TOPWR_API_BASE_URL: z.url().default("https://api.topwr.solvro.pl"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    OIDC_ISSUER_URL: process.env.OIDC_ISSUER_URL,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
    USOS_BASE_URL: process.env.USOS_BASE_URL,
    USOS_CONSUMER_KEY: process.env.USOS_CONSUMER_KEY,
    USOS_CONSUMER_SECRET: process.env.USOS_CONSUMER_SECRET,
    USOS_EMAIL_DOMAIN: process.env.USOS_EMAIL_DOMAIN,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    GITHUB_ORG: process.env.GITHUB_ORG,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
    DISCORD_INVITE_CHANNEL_ID: process.env.DISCORD_INVITE_CHANNEL_ID,
    TOPWR_API_BASE_URL: process.env.TOPWR_API_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
