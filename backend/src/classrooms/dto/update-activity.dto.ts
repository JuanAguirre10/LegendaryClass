import { IsOptional, IsDateString, IsObject, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateActivityDto {
  @ApiPropertyOptional() @IsDateString() @IsOptional() dueDate?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() overrides?: Record<string, any>;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
