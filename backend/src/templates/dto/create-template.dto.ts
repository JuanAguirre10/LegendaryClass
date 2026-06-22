import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, Difficulty } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ enum: ActivityType }) @IsEnum(ActivityType) activityType: ActivityType;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(1000) description?: string;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() xpReward?: number;
  @ApiProperty({ enum: Difficulty }) @IsEnum(Difficulty) difficulty: Difficulty;

  // homework
  @ApiPropertyOptional() @IsString() @IsOptional() instructions?: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() defaultDueDays?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() attachmentUrl?: string;

  // exercise
  @ApiPropertyOptional() @IsArray() @IsOptional() problems?: { question: string; hint?: string; answer?: string }[];

  // form + exam
  @ApiPropertyOptional() @IsArray() @IsOptional() questions?: any[];

  // exam
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() durationMinutes?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(100) @IsOptional() passingScore?: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() totalPoints?: number;
}
