import { db } from "@/db";

import { roleDefinition } from "./schema/roles";

const roleDefinitions: (typeof roleDefinition.$inferInsert)[] = [
  // Sekcja
  { scope: "section", name: "przewodniczący", permissionLevel: "member" },
  { scope: "section", name: "wiceprzewodniczący", permissionLevel: "member" },
  { scope: "section", name: "członek", permissionLevel: "member" },

  // Projekt
  { scope: "project", name: "techlead", permissionLevel: "project_lead" },
  { scope: "project", name: "PM", permissionLevel: "project_lead" },
  { scope: "project", name: "PO", permissionLevel: "project_lead" },
  { scope: "project", name: "programista", permissionLevel: "member" },
  { scope: "project", name: "UI/UX designer", permissionLevel: "member" },

  // Zarząd
  { scope: "board", name: "prezes", permissionLevel: "board" },
  { scope: "board", name: "wiceprezes", permissionLevel: "board" },
  { scope: "board", name: "sekretarz", permissionLevel: "board" },
];

async function seed() {
  await db
    .insert(roleDefinition)
    .values(roleDefinitions)
    .onConflictDoNothing({
      target: [roleDefinition.scope, roleDefinition.name],
    });

  console.log(`Seeded ${roleDefinitions.length} role definitions.`);
}

await seed();
process.exit(0);
