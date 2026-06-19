import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { getJwtSecret } from '../auth/jwt-secret';
import { RankingService } from './ranking.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:4200', credentials: true },
})
export class RankingGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private jwt: JwtService,
    private rankingService: RankingService,
    private prisma: PrismaService,
  ) {}

  // Valida el JWT del handshake; desconecta si es inválido. Guarda el user en el socket.
  // Carga el usuario desde la DB para verificar isActive y obtener el rol actualizado.
  // authReady es una promesa sincrónica que permite a onJoin esperar a que auth termine.
  handleConnection(client: Socket) {
    client.data.authReady = (async () => {
      try {
        const token =
          (client.handshake.auth?.token as string) ||
          (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
        if (!token) throw new Error('no token');
        const payload = this.jwt.verify(token, { secret: getJwtSecret() });
        const dbUser = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { isActive: true, role: true },
        });
        if (!dbUser || !dbUser.isActive) throw new Error('inactive or missing user');
        client.data.user = { id: payload.sub, role: dbUser.role };
        client.join(`user:${payload.sub}`);
      } catch {
        client.disconnect(true);
      }
    })();
  }

  @SubscribeMessage('join')
  async onJoin(@MessageBody() body: { classroomId: string }, @ConnectedSocket() client: Socket) {
    await client.data.authReady;
    const user = client.data.user;
    if (!user) return;
    try {
      await this.rankingService.assertCanView(body.classroomId, user);
      client.join(`classroom:${body.classroomId}`);
    } catch {
      // Sin acceso: no se une a la sala (silencioso).
    }
  }

  @SubscribeMessage('leave')
  onLeave(@MessageBody() body: { classroomId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`classroom:${body.classroomId}`);
  }

  async emitRankingUpdate(classroomId: string): Promise<void> {
    const ranking = await this.rankingService.computeRanking(classroomId);
    this.server.to(`classroom:${classroomId}`).emit('ranking:update', { classroomId, ranking });
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
