import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CharacterType, Rarity, RewardEffectType, RewardType } from '@prisma/client';

export class CreateRewardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiProperty({ minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  costPoints: number;

  @ApiProperty({ enum: RewardType })
  @IsEnum(RewardType)
  type: RewardType;

  @ApiProperty({ enum: RewardEffectType })
  @IsEnum(RewardEffectType)
  rewardType: RewardEffectType;

  @ApiPropertyOptional({ minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  xpBonus?: number;

  @ApiProperty({ enum: Rarity })
  @IsEnum(Rarity)
  rarity: Rarity;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  levelRequirement?: number;

  @ApiPropertyOptional({ type: [String], enum: CharacterType })
  @IsOptional()
  @IsArray()
  @IsEnum(CharacterType, { each: true })
  characterSpecific?: CharacterType[];

  @ApiPropertyOptional({ minimum: 1, maximum: 8760 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  durationHours?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUsesPerStudent?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectDescription?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classroomId: string;
}
