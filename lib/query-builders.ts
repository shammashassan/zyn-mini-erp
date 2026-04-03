// lib/query-builders.ts - Enhanced with DataTable filter support

import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

/**
 * Parse JSON query parameter safely
 */
export function parseJsonParam<T = any>(param: string | null): T | null {
  if (!param) return null;
  try {
    return JSON.parse(param) as T;
  } catch {
    return null;
  }
}

/**
 * Build Mongoose filter object from TanStack Table column filters
 * ✅ Automatically detects operator based on value type or uses provided operator
 */
export function buildFilterQuery(filters: ColumnFiltersState): Record<string, any> {
  if (!filters || filters.length === 0) return {};

  const query: Record<string, any> = {};

  filters.forEach((filter) => {
    const { id, value } = filter;
    // ✅ Get operator, with smart defaults based on value type
    let operator = (filter as any).operator;

    // ✅ If no operator is provided, infer it from the value type
    if (!operator) {
      if (typeof value === 'string') {
        operator = 'iLike'; // Text values default to "iLike" (contains, case-insensitive)
      } else if (Array.isArray(value)) {
        operator = 'inArray'; // Array values default to "inArray"
      } else {
        operator = 'eq'; // Everything else defaults to "eq" (equals)
      }
    }

    if (!id || value === undefined || value === null) return;

    console.log(`🔍 Building filter for ${id}:`, { value, operator });

    switch (operator) {
      // TEXT OPERATORS
      case "iLike": // Contains (case-insensitive)
        query[id] = { $regex: value, $options: "i" };
        break;

      case "notILike": // Does not contain
        query[id] = { $not: { $regex: value, $options: "i" } };
        break;

      // COMPARISON OPERATORS
      case "eq": // Equals
        query[id] = value;
        break;

      case "ne": // Not equals
        query[id] = { $ne: value };
        break;

      case "lt": // Less than
        query[id] = { $lt: Number(value) };
        break;

      case "lte": // Less than or equal
        query[id] = { $lte: Number(value) };
        break;

      case "gt": // Greater than
        query[id] = { $gt: Number(value) };
        break;

      case "gte": // Greater than or equal
        query[id] = { $gte: Number(value) };
        break;

      case "isBetween": // Between (range)
        if (Array.isArray(value) && value.length === 2) {
          const [min, max] = value;
          query[id] = { $gte: Number(min), $lte: Number(max) };
        }
        break;

      // ARRAY OPERATORS
      case "inArray": // Has any of (multi-select)
        if (Array.isArray(value)) {
          query[id] = { $in: value };
        }
        break;

      case "notInArray": // Has none of
        if (Array.isArray(value)) {
          query[id] = { $nin: value };
        }
        break;

      // NULL/EMPTY OPERATORS
      case "isEmpty": // Is empty
        query[id] = { $in: [null, "", []] };
        break;

      case "isNotEmpty": // Is not empty
        query[id] = { $nin: [null, "", []], $exists: true };
        break;

      // DATE OPERATORS
      case "isRelativeToToday": // Relative date
        query[id] = value;
        break;

      default:
        // Default to equals
        query[id] = value;
    }
  });

  console.log('✅ Built Mongoose query:', query);
  return query;
}

/**
 * Build Mongoose sort object from TanStack Table sorting state
 */
export function buildSortQuery(
  sorting: SortingState,
  defaultSort: Record<string, 1 | -1> = { createdAt: -1 }
): Record<string, 1 | -1> {
  if (!sorting || sorting.length === 0) return defaultSort;

  const sort: Record<string, 1 | -1> = {};

  sorting.forEach((item) => {
    if (item.id) {
      sort[item.id] = item.desc ? -1 : 1;
    }
  });

  return Object.keys(sort).length > 0 ? sort : defaultSort;
}

/**
 * Build pagination options for Mongoose query
 */
export function buildPaginationQuery(
  page: number = 1,
  pageSize: number = 10
): { skip: number; limit: number } {
  const validPage = Math.max(1, page);
  const validPageSize = Math.max(1, Math.min(100, pageSize));

  return {
    skip: (validPage - 1) * validPageSize,
    limit: validPageSize,
  };
}

/**
 * Extract table query parameters from URL searchParams
 */
export function extractTableParams(searchParams: URLSearchParams) {
  return {
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
    sorting: parseJsonParam<SortingState>(searchParams.get("sort")) || [],
    filters: parseJsonParam<ColumnFiltersState>(searchParams.get("filters")) || [],
  };
}

/**
 * Execute a paginated Mongoose query with sorting and filtering
 */
export async function executePaginatedQuery<T>(
  Model: any,
  options: {
    baseFilter?: Record<string, any>;
    columnFilters?: ColumnFiltersState;
    sorting?: SortingState;
    page?: number;
    pageSize?: number;
    defaultSort?: Record<string, 1 | -1>;
    populate?: any;
  }
) {
  const {
    baseFilter = {},
    columnFilters = [],
    sorting = [],
    page = 1,
    pageSize = 10,
    defaultSort = { createdAt: -1 },
    populate,
  } = options;

  // Build queries
  const filterQuery = buildFilterQuery(columnFilters);
  const sortQuery = buildSortQuery(sorting, defaultSort);
  const { skip, limit } = buildPaginationQuery(page, pageSize);

  // Combine filters
  const finalFilter = { ...baseFilter, ...filterQuery };

  // Execute count and data queries in parallel
  const [totalCount, data] = await Promise.all([
    Model.countDocuments(finalFilter),
    (async () => {
      let query = Model.find(finalFilter).sort(sortQuery).skip(skip).limit(limit);

      if (populate) {
        if (Array.isArray(populate)) {
          populate.forEach(p => { query = query.populate(p); });
        } else {
          query = query.populate(populate);
        }
      }

      return query.exec();
    })(),
  ]);

  return {
    data,
    pageCount: Math.ceil(totalCount / pageSize),
    totalCount,
    currentPage: page,
    pageSize,
  };
}

/**
 * Type-safe filter operator type
 */
export type FilterOperator =
  | "iLike"
  | "notILike"
  | "eq"
  | "ne"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "isBetween"
  | "inArray"
  | "notInArray"
  | "isEmpty"
  | "isNotEmpty"
  | "isRelativeToToday";

/**
 * Extended column filter with operator
 */
export interface ExtendedColumnFilter {
  id: string;
  value: any;
  operator?: FilterOperator;
}