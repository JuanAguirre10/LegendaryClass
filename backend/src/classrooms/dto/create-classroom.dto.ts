import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassroomDto {
  @ApiProperty({ example: 'Matemáticas 3ro A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'Matemáticas' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: '3ro Secundaria' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ example: '2025-2026' })
  @IsOptional()
  @IsString()
  schoolYear?: string;
}
