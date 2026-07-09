import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClaimItemDto {
  @ApiProperty({ enum: ['quest', 'behavior', 'achievement'] })
  @IsIn(['quest', 'behavior', 'achievement'])
  type!: 'quest' | 'behavior' | 'achievement';

  @ApiProperty()
  @IsString()
  id!: string;
}

export class ClaimXpDto {
  @ApiPropertyOptional({ type: [ClaimItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClaimItemDto)
  claims?: ClaimItemDto[];

  @ApiPropertyOptional({ description: 'Canjear todo el buzón de una vez' })
  @IsOptional()
  @IsBoolean()
  claimAll?: boolean;
}
