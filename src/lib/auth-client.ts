import { usosAuthClient } from "better-auth-usos/client";
import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [genericOAuthClient(), usosAuthClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
