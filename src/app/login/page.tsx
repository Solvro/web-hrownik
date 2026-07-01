"use client";

import Image from "next/image";

import logoMono from "@/assets/logo-mono.svg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

const logoMonoSource = logoMono as unknown as string;

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="bg-sidebar-primary text-sidebar-primary-foreground mb-2 flex size-12 shrink-0 items-center justify-center rounded-xl">
            <Image
              src={logoMonoSource}
              alt=""
              className="size-7"
              aria-hidden="true"
            />
          </span>
          <CardTitle className="text-xl">Zaloguj się do HRownika</CardTitle>
          <CardDescription>Wybierz metodę logowania</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
