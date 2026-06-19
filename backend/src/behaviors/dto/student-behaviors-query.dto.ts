import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Pagination + optional studentId filter for the behavior history endpoint. */
export class StudentBehaviorsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;
}
