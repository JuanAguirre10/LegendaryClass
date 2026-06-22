import { IsEnum, IsOptional, IsString, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, ActivityMode } from '@prisma/client';

export class ImportActivityDto {
  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ enum: ActivityMode })
  @IsEnum(ActivityMode)
  mode: ActivityMode;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  overrides?: Record<string, any>;
}
