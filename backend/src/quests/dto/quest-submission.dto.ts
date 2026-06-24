import { IsOptional, IsString } from 'class-validator';

export class ApproveSubmissionDto {
  @IsOptional()
  @IsString()
  teacherNotes?: string;
}

export class RejectSubmissionDto {
  @IsOptional()
  @IsString()
  teacherNotes?: string;
}
