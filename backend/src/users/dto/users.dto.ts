import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() gradeLevel?: string;
  @IsOptional() @IsString() phone?: string;
}

export class UpdatePasswordDto {
  @IsString() @MinLength(8) password!: string;
}
