import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RankingInput {
  studentId: string;
  name: string;
  characterType: string | null;
  level: number;
  totalPoints: number;
}

export interface RankingEntry extends RankingInput {
  rank: number;
}

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  buildRanking(rows: RankingInput[]): RankingEntry[] {
    return [...rows]
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
      })
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }
}
