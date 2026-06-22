import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseCategory } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() icon?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
  @ApiProperty({ enum: CourseCategory }) @IsEnum(CourseCategory) category: CourseCategory;
}
