import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Pagination + optional classroomId filter for the student redemption history. */
export class StudentRewardsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  classroomId?: string;
}
