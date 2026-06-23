import { IsOptional, IsString } from 'class-validator';

export class TakeSnapshotDto {
  @IsOptional() @IsString() classroomId?: string;
}
