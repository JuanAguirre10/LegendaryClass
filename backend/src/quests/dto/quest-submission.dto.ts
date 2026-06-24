import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ApproveSubmissionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherNotes?: string;
}

export class RejectSubmissionDto {
  @ApiProperty({ description: 'Feedback obligatorio al rechazar' })
  @IsString()
  @MinLength(1)
  teacherNotes!: string;
}
