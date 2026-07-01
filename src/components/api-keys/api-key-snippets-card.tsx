"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { env } from "@/env";

const baseUrl = `${env.NEXT_PUBLIC_APP_URL}/api/v1`;

const snippets = {
  curl: String.raw`curl "${baseUrl}/members" \
  -H "Authorization: Bearer TWÓJ_KLUCZ_API"`,
  node: `const response = await fetch("${baseUrl}/members", {
  headers: {
    Authorization: \`Bearer \${process.env.HROWNIK_API_KEY}\`,
  },
});
const { data } = await response.json();`,
} as const;

export function ApiKeySnippetsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jak używać</CardTitle>
        <CardDescription>
          Dostępne zasoby: /members, /projects, /sections. Klucz wysyłasz w
          nagłówku Authorization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="curl">
          <TabsList>
            <TabsTrigger value="curl">curl</TabsTrigger>
            <TabsTrigger value="node">Node.js</TabsTrigger>
          </TabsList>
          <TabsContent value="curl">
            <SnippetBlock code={snippets.curl} />
          </TabsContent>
          <TabsContent value="node">
            <SnippetBlock code={snippets.node} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SnippetBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div className="relative">
      <pre className="bg-muted rounded-md border p-3 pr-10 text-xs break-all whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="absolute top-2 right-2"
        onClick={() => void copy()}
        aria-label="Skopiuj fragment kodu"
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}
