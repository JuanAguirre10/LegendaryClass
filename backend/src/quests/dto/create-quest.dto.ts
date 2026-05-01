import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 10, maximum: 1000, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  xpReward?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'IDs de estudiantes a quienes asignar la quest' })
  @IsOptional()
  studentIds?: string[];
}
