import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BehaviorCategory, BehaviorType } from '@prisma/client';

export class CreateBehaviorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: BehaviorType })
  @IsEnum(BehaviorType)
  type: BehaviorType;

  @ApiProperty({ minimum: -100, maximum: 100 })
  @IsInt()
  @Min(-100)
  @Max(100)
  points: number;

  @ApiProperty({ enum: BehaviorCategory })
  @IsEnum(BehaviorCategory)
  category: BehaviorCategory;

  @ApiPropertyOptional({ example: '#4F46E5' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color debe ser un hex válido (#RRGGBB)' })
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'ID del aula a la que pertenece este comportamiento' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;
}
