import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Aguirre' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'juan@email.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'mipassword123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.student })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
