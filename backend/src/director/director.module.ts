import { Module } from '@nestjs/common';
import { DirectorService } from './director.service';
import { DirectorController } from './director.controller';

@Module({
  providers: [DirectorService],
  controllers: [DirectorController],
})
export class DirectorModule {}
