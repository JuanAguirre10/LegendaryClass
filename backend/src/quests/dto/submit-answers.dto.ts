import { IsNotEmptyObject, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswersDto {
  @ApiProperty({ description: 'Mapa preguntaId → respuesta del estudiante' })
  @IsObject()
  @IsNotEmptyObject()
  answers!: Record<string, any>;
}
