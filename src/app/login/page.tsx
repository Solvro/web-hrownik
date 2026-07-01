"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Zaloguj się do HRownika</h1>
          <p className="text-muted-foreground text-sm">
            Wybierz metodę logowania
          </p>
        </div>

        <FieldGroup>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void authClient.signIn.oauth2({
                providerId: "keycloak",
                callbackURL: "/",
              });
            }}
          >
            Zaloguj przez Solvro Auth
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void authClient.signIn.usos({ callbackURL: "/" });
            }}
          >
            Zaloguj przez USOS
          </Button>
        </FieldGroup>
      </div>
    </div>
  );
}
