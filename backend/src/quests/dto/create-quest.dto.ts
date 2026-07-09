import { IsArray, IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 10, maximum: 1000, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  xpReward?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'IDs de estudiantes a quienes asignar la quest' })
  @IsOptional()
  studentIds?: string[];

  @ApiPropertyOptional({ description: 'Si la quest requiere entrega de evidencia', default: false })
  @IsOptional()
  @IsBoolean()
  requiresSubmission?: boolean;

  @ApiPropertyOptional({ description: 'Número máximo de intentos de entrega', default: 1, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Preguntas del formulario en línea (exámenes/ejercicios)' })
  @IsOptional()
  @IsArray()
  questions?: any[];

  @ApiPropertyOptional({ description: 'Puntaje mínimo (%) para aprobar el formulario', default: 60, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;
}
