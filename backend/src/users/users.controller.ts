import { Controller, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: any,
    @Body() body: { name?: string; avatar?: string; gradeLevel?: string; phone?: string },
  ) {
    return this.usersService.update(user.id, body);
  }

  @Patch('profile/password')
  async updatePassword(@CurrentUser() user: any, @Body() body: { password: string }) {
    const hashed = await bcrypt.hash(body.password, 10);
    await this.usersService.updatePassword(user.id, hashed);
    return { message: 'Contraseña actualizada' };
  }

  @Delete('profile')
  deleteAccount(@CurrentUser() user: any) {
    return this.usersService.delete(user.id);
  }
}
