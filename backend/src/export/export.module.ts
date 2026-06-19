import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
