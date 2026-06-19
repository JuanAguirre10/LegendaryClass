import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Reusable pagination query parameters. When `page` is omitted the endpoint
 * returns the full collection (backward-compatible); when supplied it returns
 * the requested slice. `limit` is capped to protect the database.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, description: '1-based page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number | null;
    limit: number | null;
    totalPages: number;
  };
}

/**
 * Turns Prisma `findMany` arguments into a paginated result. Pass the model
 * delegate (e.g. `prisma.user`), the base query, and the pagination params.
 * Runs the count and the page query in parallel.
 */
export async function paginate<T>(
  model: { findMany: (args: any) => Promise<T[]>; count: (args: any) => Promise<number> },
  baseArgs: Record<string, any>,
  { page, limit }: PaginationQueryDto,
): Promise<PaginatedResult<T>> {
  // No page requested → return everything (preserves legacy behavior).
  if (!page) {
    const data = await model.findMany(baseArgs);
    return {
      data,
      meta: { total: data.length, page: null, limit: null, totalPages: 1 },
    };
  }

  const take = limit ?? 20;
  const skip = (page - 1) * take;
  const where = baseArgs.where ?? {};

  const [data, total] = await Promise.all([
    model.findMany({ ...baseArgs, skip, take }),
    model.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
  };
}
