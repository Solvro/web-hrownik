import { text } from "drizzle-orm/pg-core";

export function id() {
  return text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
}
