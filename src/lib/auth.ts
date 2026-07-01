import { betterAuth } from "better-auth";
import { usosAuth } from "better-auth-usos";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, keycloak } from "better-auth/plugins/generic-oauth";

import { db } from "@/db";
import { env } from "@/env";

const authPlugins = [];

if (
  env.OIDC_ISSUER_URL !== undefined &&
  env.OIDC_CLIENT_ID !== undefined &&
  env.OIDC_CLIENT_SECRET !== undefined
) {
  const solvroAuth = keycloak({
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    issuer: env.OIDC_ISSUER_URL,
  });

  authPlugins.push(
    genericOAuth({
      config: [
        {
          ...solvroAuth,
          mapProfileToUser: (profile) => {
            const email =
              typeof profile.email === "string" ? profile.email : "";
            const name =
              typeof profile.name === "string" && profile.name.trim() !== ""
                ? profile.name
                : [profile.given_name, profile.family_name]
                    .filter(
                      (part): part is string =>
                        typeof part === "string" && part.trim() !== "",
                    )
                    .join(" ") ||
                  (typeof profile.preferred_username === "string" &&
                  profile.preferred_username.trim() !== ""
                    ? profile.preferred_username
                    : email.split("@")[0]);

            return { name };
          },
        },
      ],
    }),
  );
}

if (
  env.USOS_BASE_URL !== undefined &&
  env.USOS_CONSUMER_KEY !== undefined &&
  env.USOS_CONSUMER_SECRET !== undefined &&
  env.USOS_EMAIL_DOMAIN !== undefined
) {
  authPlugins.push(
    usosAuth({
      usosBaseUrl: env.USOS_BASE_URL,
      consumerKey: env.USOS_CONSUMER_KEY,
      consumerSecret: env.USOS_CONSUMER_SECRET,
      emailDomain: env.USOS_EMAIL_DOMAIN,
      userFields: (usosProfile) => ({
        studentNumber:
          usosProfile.student_number === null
            ? null
            : Number.parseInt(usosProfile.student_number),
        usosId: usosProfile.id,
        firstName: usosProfile.first_name,
        lastName: usosProfile.last_name,
      }),
    }),
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      studentNumber: { type: "number", required: false },
      usosId: { type: "string", required: false },
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
    },
  },
  plugins: authPlugins,
});
