// frontend/src/app/core/realtime/realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '@env/environment';
import { AuthService } from '../auth/auth.service';

export interface RankingEntry {
  studentId: string;
  name: string;
  characterType: string | null;
  level: number;
  totalPoints: number;
  rank: number;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket?: Socket;
  private socketToken: string | null = null;

  constructor(private auth: AuthService) {}

  private ensureSocket(): Socket {
    const token = this.auth.token() ?? '';
    if (this.socket && this.socketToken !== token) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    if (!this.socket) {
      // environment.apiUrl = http://localhost:3000/api/v1 → origin = http://localhost:3000
      const origin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
      this.socket = io(origin, {
        auth: { token },
        transports: ['websocket'],
      });
      this.socketToken = token;
    }
    return this.socket;
  }

  onClassroomRanking(classroomId: string): Observable<RankingEntry[]> {
    const socket = this.ensureSocket();
    return new Observable<RankingEntry[]>((subscriber) => {
      const handler = (payload: { classroomId: string; ranking: RankingEntry[] }) => {
        if (payload.classroomId === classroomId) subscriber.next(payload.ranking);
      };
      socket.on('ranking:update', handler);
      socket.emit('join', { classroomId });
      return () => {
        socket.emit('leave', { classroomId });
        socket.off('ranking:update', handler);
      };
    });
  }

  ngOnDestroy() {
    this.socket?.disconnect();
  }
}
