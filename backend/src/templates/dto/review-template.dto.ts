import { IsBoolean, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewTemplateDto {
  @ApiProperty() @IsBoolean() approved: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string;
}
