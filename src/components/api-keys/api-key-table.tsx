"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { deleteApiKey } from "@/actions/api-keys";
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";
import { DeleteButton } from "@/components/delete-button";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export interface ApiKeyEndpointStat {
  resource: string;
  requestCount: number;
}

export interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  requestCount: number;
  endpointStats: ApiKeyEndpointStat[];
  lastUsedAt: Date | null;
  createdAt: Date;
  createdByMemberId: string | null;
  createdByName: string | null;
  createdByPhotoUrl: string | null;
}

export function ApiKeyTable({ apiKeys }: { apiKeys: ApiKeyData[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Klucze</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Wygeneruj klucz
            </Button>
          </DialogTrigger>
          <CreateApiKeyDialog
            onClose={() => {
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>
      {apiKeys.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
          Brak kluczy API. Wygeneruj pierwszy, aby zezwolić zewnętrznym usługom
          na odczyt danych przez /api/v1.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Klucz</TableHead>
                <TableHead>Zapytania</TableHead>
                <TableHead>Wg endpointu</TableHead>
                <TableHead>Ostatnio użyty</TableHead>
                <TableHead>Utworzono</TableHead>
                <TableHead>Utworzył</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-muted-foreground text-xs">
                      {key.keyPrefix}…
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{key.requestCount}</Badge>
                  </TableCell>
                  <TableCell>
                    {key.endpointStats.length === 0 ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {key.endpointStats.map((stat) => (
                          <Badge key={stat.resource} variant="outline">
                            {stat.resource}: {stat.requestCount}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {key.lastUsedAt === null ? (
                      "Nigdy"
                    ) : (
                      <RelativeTime date={key.lastUsedAt} />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <RelativeTime date={key.createdAt} />
                  </TableCell>
                  <TableCell>
                    {key.createdByName === null ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          {key.createdByPhotoUrl === null ? null : (
                            <AvatarImage
                              src={key.createdByPhotoUrl}
                              alt={key.createdByName}
                            />
                          )}
                          <AvatarFallback>
                            {getInitials(key.createdByName)}
                          </AvatarFallback>
                        </Avatar>
                        {key.createdByMemberId === null ? (
                          <span className="truncate text-sm">
                            {key.createdByName}
                          </span>
                        ) : (
                          <Link
                            href={`/members/${key.createdByMemberId}`}
                            className="truncate text-sm hover:underline"
                          >
                            {key.createdByName}
                          </Link>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      action={deleteApiKey.bind(null, key.id)}
                      confirmMessage={`Usunięcie klucza „${key.name}” natychmiast zablokuje dostęp usługom, które go używają.`}
                    >
                      Usuń
                    </DeleteButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
