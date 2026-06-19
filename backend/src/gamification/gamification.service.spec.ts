import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Unit tests for the pure XP / level / tier formulas — the core invariants
 * documented in CLAUDE.md. These methods don't touch the database, so we pass
 * a stub PrismaService.
 */
describe('GamificationService — formulas', () => {
  let service: GamificationService;

  beforeEach(() => {
    service = new GamificationService({} as PrismaService, {} as any, {} as any);
  });

  describe('calculateLevel — level = floor(sqrt(xp / 100)) + 1', () => {
    it('returns level 1 at 0 XP', () => {
      expect(service.calculateLevel(0)).toBe(1);
    });

    it('stays at level 1 just below the level-2 threshold (100 XP)', () => {
      expect(service.calculateLevel(99)).toBe(1);
    });

    it('reaches level 2 at exactly 100 XP', () => {
      expect(service.calculateLevel(100)).toBe(2);
    });

    it('reaches level 3 at exactly 400 XP', () => {
      expect(service.calculateLevel(400)).toBe(3);
    });

    it('reaches level 11 at 10000 XP', () => {
      expect(service.calculateLevel(10000)).toBe(11);
    });
  });

  describe('getNextLevelXp — XP for next level = level² × 100', () => {
    it.each([
      [1, 100],
      [2, 400],
      [3, 900],
      [10, 10000],
    ])('level %i needs %i XP', (level, expected) => {
      expect(service.getNextLevelXp(level)).toBe(expected);
    });
  });

  describe('getCurrentLevelXp — XP floor of the current level', () => {
    it('is 0 for level 1', () => {
      expect(service.getCurrentLevelXp(1)).toBe(0);
    });

    it('is 100 for level 2', () => {
      expect(service.getCurrentLevelXp(2)).toBe(100);
    });

    it("matches the previous level's next-level XP", () => {
      expect(service.getCurrentLevelXp(5)).toBe(service.getNextLevelXp(4));
    });
  });

  describe('getLevelProgress — percentage toward the next level', () => {
    it('is 0% at the start of a level', () => {
      expect(service.getLevelProgress(100, 2)).toBe(0);
    });

    it('is ~50% halfway through a level', () => {
      // Level 2 spans XP 100 → 400 (range 300); halfway = 250
      expect(service.getLevelProgress(250, 2)).toBe(50);
    });

    it('is 100% at the next-level threshold', () => {
      expect(service.getLevelProgress(400, 2)).toBe(100);
    });
  });

  describe('getTier — Novato 1-24, Veterano 25-49, Épico 50-74, Legendario 75+', () => {
    it.each([
      [1, 1],
      [24, 1],
      [25, 2],
      [49, 2],
      [50, 3],
      [74, 3],
      [75, 4],
      [120, 4],
    ])('level %i is tier %i', (level, expectedTier) => {
      expect(service.getTier(level)).toBe(expectedTier);
    });

    it('maps tiers to their names', () => {
      expect(service.getTierName(service.getTier(10))).toBe('Novato');
      expect(service.getTierName(service.getTier(30))).toBe('Veterano');
      expect(service.getTierName(service.getTier(60))).toBe('Épico');
      expect(service.getTierName(service.getTier(80))).toBe('Legendario');
    });
  });
});
