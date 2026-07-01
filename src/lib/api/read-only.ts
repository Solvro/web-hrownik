import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { Column, SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";

import { db } from "@/db";

interface RelationSpec {
  [name: string]: RelationSpec | undefined;
}

interface QueryConfiguration {
  columns?: Record<string, boolean>;
  where?: SQL;
  orderBy?: SQL[];
  limit?: number;
  offset?: number;
  with?: Record<string, true | { with: Record<string, unknown> }>;
}

interface EndpointConfig {
  query: {
    findMany: (configuration: QueryConfiguration) => Promise<unknown[]>;
    findFirst: (configuration: QueryConfiguration) => Promise<unknown>;
  };
  table: PgTable;
  columns: Partial<Record<string, Column>>;
  defaultSort: string;
  searchable?: string[];
  relations?: RelationSpec;
  columnsSelection?: Record<string, boolean>;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const RESERVED_PARAMS = new Set([
  "include",
  "page",
  "pageSize",
  "limit",
  "offset",
  "sort",
  "order",
  "q",
]);

function parsePositiveInteger(value: string | null, fallback: number) {
  if (value === null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function parseNonNegativeInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function parsePagination(searchParameters: URLSearchParams) {
  const page = parsePositiveInteger(searchParameters.get("page"), 1);
  const pageSize = Math.min(
    parsePositiveInteger(
      searchParameters.get("pageSize") ?? searchParameters.get("limit"),
      DEFAULT_PAGE_SIZE,
    ),
    MAX_PAGE_SIZE,
  );
  const explicitOffset = searchParameters.get("offset");
  const offset =
    explicitOffset === null
      ? (page - 1) * pageSize
      : parseNonNegativeInteger(explicitOffset, 0);

  return { page, pageSize, offset };
}

function parseSort(searchParameters: URLSearchParams, config: EndpointConfig) {
  const sortParameter = searchParameters.get("sort") ?? config.defaultSort;
  const orderParameter = searchParameters.get("order");

  return sortParameter
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const direction = part.startsWith("-")
        ? "desc"
        : (orderParameter ?? "asc");
      const field = part.replace(/^-/, "");
      const column = config.columns[field];

      if (column === undefined) {
        return [];
      }

      return direction === "desc" ? [desc(column)] : [asc(column)];
    });
}

function parseFilterKey(key: string) {
  const bracketMatch = /^filter\[([^\]]+)\]$/.exec(key);
  const normalized = bracketMatch?.[1] ?? key.replace(/^filter\./, "");
  const [field, operator = "eq"] = normalized.split("__");

  return { field, operator };
}

function parseFilters(
  searchParameters: URLSearchParams,
  config: EndpointConfig,
) {
  const filters: SQL[] = [];

  for (const [key, value] of searchParameters.entries()) {
    if (value === "" || RESERVED_PARAMS.has(key)) {
      continue;
    }

    const isFilterParameter =
      key.startsWith("filter[") || key.startsWith("filter.");
    if (
      !isFilterParameter &&
      config.columns[key.split("__")[0]] === undefined
    ) {
      continue;
    }

    const { field, operator } = parseFilterKey(key);
    const column = config.columns[field];
    if (column === undefined) {
      continue;
    }

    if (operator === "contains") {
      filters.push(ilike(column, `%${value}%`));
      continue;
    }

    if (operator === "isNull") {
      if (value === "true" || value === "1") {
        filters.push(isNull(column));
      }
      continue;
    }

    filters.push(eq(column, value));
  }

  const query = searchParameters.get("q")?.trim();
  if (
    query !== undefined &&
    query.length > 0 &&
    config.searchable !== undefined
  ) {
    const searchableFilters = config.searchable
      .map((field) => config.columns[field])
      .filter((column): column is Column => column !== undefined)
      .map((column) => ilike(column, `%${query}%`));

    if (searchableFilters.length > 0) {
      const searchFilter =
        searchableFilters.length === 1
          ? searchableFilters[0]
          : or(...searchableFilters);
      if (searchFilter !== undefined) {
        filters.push(searchFilter);
      }
    }
  }

  return filters;
}

function buildRelations(
  searchParameters: URLSearchParams,
  config: EndpointConfig,
) {
  const include = searchParameters.get("include")?.trim();
  if (
    include === undefined ||
    include.length === 0 ||
    config.relations === undefined
  ) {
    return;
  }

  const requestedTree: RelationSpec = {};
  for (const path of include.split(",")) {
    const parts = path.trim().split(".").filter(Boolean).slice(0, 5);
    let current = requestedTree;
    for (const part of parts) {
      current[part] ??= {};
      current = current[part];
    }
  }

  return buildAllowedRelations(requestedTree, config.relations);
}

function buildAllowedRelations(requested: RelationSpec, allowed: RelationSpec) {
  const result: Record<string, true | { with: Record<string, unknown> }> = {};

  for (const [name, nestedRequested] of Object.entries(requested)) {
    const nestedAllowed = allowed[name];
    if (nestedAllowed === undefined) {
      continue;
    }

    if (nestedRequested === undefined) {
      continue;
    }

    const nested = buildAllowedRelations(nestedRequested, nestedAllowed);
    result[name] = Object.keys(nested).length > 0 ? { with: nested } : true;
  }

  return result;
}

function getWhere(filters: SQL[]) {
  if (filters.length === 0) {
    return;
  }

  return filters.length === 1 ? filters[0] : and(...filters);
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function listReadOnly(request: Request, config: EndpointConfig) {
  const searchParameters = new URL(request.url).searchParams;
  const { page, pageSize, offset } = parsePagination(searchParameters);
  const filters = parseFilters(searchParameters, config);
  const orderBy = parseSort(searchParameters, config);
  const withRelations = buildRelations(searchParameters, config);
  const where = getWhere(filters);

  if (orderBy.length === 0) {
    return badRequest("Invalid sort field.");
  }

  const [items, totalRows] = await Promise.all([
    config.query.findMany({
      columns: config.columnsSelection,
      where,
      orderBy,
      limit: pageSize,
      offset,
      ...(withRelations === undefined ? {} : { with: withRelations }),
    }),
    db.select({ value: count() }).from(config.table).where(where),
  ]);
  const total = totalRows[0]?.value ?? 0;

  return NextResponse.json({
    meta: {
      page,
      pageSize,
      offset,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    data: items,
  });
}

export async function getReadOnly(
  request: Request,
  id: string,
  config: EndpointConfig,
) {
  const searchParameters = new URL(request.url).searchParams;
  const withRelations = buildRelations(searchParameters, config);
  const idColumn = config.columns.id;
  if (idColumn === undefined) {
    return NextResponse.json(
      { error: "Resource is missing an ID column." },
      { status: 500 },
    );
  }

  const item = await config.query.findFirst({
    columns: config.columnsSelection,
    where: eq(idColumn, id),
    ...(withRelations === undefined ? {} : { with: withRelations }),
  });

  if (item === undefined) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: item });
}
