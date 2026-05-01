import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Token inválido o expirado');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta está desactivada');
    }
    return user;
  }
}
