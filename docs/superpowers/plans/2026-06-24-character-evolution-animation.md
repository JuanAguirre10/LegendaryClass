# Character Evolution Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a student levels up to a tier boundary (25/50/75) and closes the tier overlay, the character panel animates from the old tier image to the new tier image via a sweep-reveal effect.

**Architecture:** Before `auth.updateUser` fires in `handleClaimResult`, capture the old tier's image URL in `prevCharImage`. When the tier overlay closes and scrolls to the character panel, `charEvolutionActive` triggers a 3-layer CSS animation (old image shakes+fades, golden sweep rises from bottom to top, new image clip-path reveals from feet up). After 2.2s the signals reset.

**Tech Stack:** Angular 18 signals, CSS keyframes (`@keyframes`), TailwindCSS utility classes inline.

## Global Constraints

- Animation only fires on tier changes: `res.newLevel` is exactly 25, 50, or 75.
- Total animation duration: 2.2s — do not exceed.
- No new dependencies. Pure CSS + existing Angular signals pattern.
- `charImagePath(type, tier)` from `frontend/src/app/core/models/user.model.ts` is the function to build image URLs. Import is already present.
- `levelToTier(level)` from the same file converts a level number to `1|2|3|4`.
- Do not remove or modify `characterLevelUp` signal — it is used by non-tier level-ups and must stay.

---

### Task 1: TypeScript — capture old image + trigger animation

**Files:**
- Modify: `frontend/src/app/features/student/dashboard/student-dashboard.component.ts`

**Interfaces:**
- Produces: `prevCharImage = signal('')`, `charEvolutionActive = signal(false)`, modified `handleClaimResult`, modified `scrollToCharacter`, new `getCharEvolutionImages()`

- [ ] **Step 1: Add the two new signals** after the existing `characterLevelUp` signal (line ~24):

```typescript
characterLevelUp = signal(false);
prevCharImage = signal('');
charEvolutionActive = signal(false);
```

- [ ] **Step 2: Modify `handleClaimResult` to capture old image before `updateUser`**

Find this block (current lines ~156–174):
```typescript
private handleClaimResult(res: any) {
  this.claimingId.set(null);
  this.claimingAll.set(false);
  this.claimingSelected.set(false);
  if (res.totalXpClaimed > 0) {
    this.auth.updateUser({ experiencePoints: res.newXp, level: res.newLevel });
    this.showToast(`+${res.totalXpClaimed} XP canjeados!`, 'success', '⚡');
    if (res.leveledUp) {
      const tier = ([25, 50, 75] as number[]).includes(res.newLevel) ? res.newLevel as 25 | 50 | 75 : 0;
      if (tier) {
        this.tierEvolution.set(tier);
      } else {
        this.showEvolution.set(true);
      }
    }
    this.loadDashboard();
  }
  this.loadInbox();
}
```

Replace with:
```typescript
private handleClaimResult(res: any) {
  this.claimingId.set(null);
  this.claimingAll.set(false);
  this.claimingSelected.set(false);
  if (res.totalXpClaimed > 0) {
    const isTierChange = ([25, 50, 75] as number[]).includes(res.newLevel);
    if (isTierChange) {
      const currentType = this.user?.characterType;
      if (currentType) {
        const oldTier = levelToTier(this.user?.level ?? 1);
        this.prevCharImage.set(charImagePath(currentType, oldTier));
      }
    }
    this.auth.updateUser({ experiencePoints: res.newXp, level: res.newLevel });
    this.showToast(`+${res.totalXpClaimed} XP canjeados!`, 'success', '⚡');
    if (res.leveledUp) {
      const tier = isTierChange ? res.newLevel as 25 | 50 | 75 : 0;
      if (tier) {
        this.tierEvolution.set(tier);
      } else {
        this.showEvolution.set(true);
      }
    }
    this.loadDashboard();
  }
  this.loadInbox();
}
```

- [ ] **Step 3: Modify `scrollToCharacter` to trigger `charEvolutionActive` when a prev image is stored**

Find (current lines ~276–282):
```typescript
private scrollToCharacter() {
  setTimeout(() => {
    document.getElementById('character-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.characterLevelUp.set(true);
    setTimeout(() => this.characterLevelUp.set(false), 2200);
  }, 50);
}
```

Replace with:
```typescript
private scrollToCharacter() {
  setTimeout(() => {
    document.getElementById('character-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (this.prevCharImage()) {
      this.charEvolutionActive.set(true);
      setTimeout(() => {
        this.charEvolutionActive.set(false);
        this.prevCharImage.set('');
      }, 2200);
    } else {
      this.characterLevelUp.set(true);
      setTimeout(() => this.characterLevelUp.set(false), 2200);
    }
  }, 50);
}
```

- [ ] **Step 4: Add `getCharEvolutionImages()` helper** (place near `getCharacterImage`):

```typescript
getCharEvolutionImages(): { oldSrc: string; newSrc: string } {
  return {
    oldSrc: this.prevCharImage(),
    newSrc: this.getCharacterImage(),
  };
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run from `frontend/`:
```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/student/dashboard/student-dashboard.component.ts
git commit -m "feat(anim): capture old tier image and trigger charEvolutionActive on tier close"
```

---

### Task 2: HTML + CSS — 3-layer sweep animation in the character panel

**Files:**
- Modify: `frontend/src/app/features/student/dashboard/student-dashboard.component.html`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `charEvolutionActive()`, `getCharEvolutionImages()` from Task 1.

- [ ] **Step 1: Replace the character image block in the HTML**

Find this block in the HTML (inside the `lg:col-span-2` panel, around line 225–238):
```html
<!-- Imagen del personaje — llena todo el panel como en PHP -->
<div class="absolute inset-0 z-10 flex items-center justify-center p-5" (mouseenter)="onCharacterHover($event)">
  <img [src]="getCharacterImage()"
    [alt]="charInfo?.name"
    [class.char-levelup]="characterLevelUp()"
    class="character-evolved"
    style="width: 100%; height: 100%; object-fit: contain; max-width: none; max-height: none; filter: drop-shadow(0 8px 30px rgba(251,191,36,0.4));"
    (error)="onImgError($event, charInfo?.icon ?? '🧙‍♂️')" />
</div>

<!-- Flash de evolución sobre la imagen -->
@if (characterLevelUp()) {
  <div class="char-levelup-flash absolute inset-0 z-30 pointer-events-none rounded-2xl"></div>
}
```

Replace with:
```html
<!-- Imagen del personaje — llena todo el panel como en PHP -->
@if (charEvolutionActive()) {
  <!-- Layer 1: old tier image — shakes then fades -->
  <div class="absolute inset-0 z-10 flex items-center justify-center p-5 pointer-events-none">
    <img [src]="getCharEvolutionImages().oldSrc"
      alt=""
      class="char-evo-old"
      style="width:100%;height:100%;object-fit:contain;" />
  </div>
  <!-- Layer 2: sweep overlay — golden light rises bottom→top then exits top -->
  <div class="char-evo-sweep absolute inset-0 z-20 pointer-events-none rounded-2xl"></div>
  <!-- Layer 3: new tier image — clip-path reveal from feet up, then glow -->
  <div class="absolute inset-0 z-10 flex items-center justify-center p-5 pointer-events-none">
    <img [src]="getCharEvolutionImages().newSrc"
      [alt]="charInfo?.name"
      class="char-evo-new"
      style="width:100%;height:100%;object-fit:contain;"
      (error)="onImgError($event, charInfo?.icon ?? '🧙‍♂️')" />
  </div>
} @else {
  <div class="absolute inset-0 z-10 flex items-center justify-center p-5" (mouseenter)="onCharacterHover($event)">
    <img [src]="getCharacterImage()"
      [alt]="charInfo?.name"
      [class.char-levelup]="characterLevelUp()"
      class="character-evolved"
      style="width: 100%; height: 100%; object-fit: contain; max-width: none; max-height: none; filter: drop-shadow(0 8px 30px rgba(251,191,36,0.4));"
      (error)="onImgError($event, charInfo?.icon ?? '🧙‍♂️')" />
  </div>
  <!-- Flash de evolución sobre la imagen (non-tier levelup) -->
  @if (characterLevelUp()) {
    <div class="char-levelup-flash absolute inset-0 z-30 pointer-events-none rounded-2xl"></div>
  }
}
```

- [ ] **Step 2: Add CSS keyframes and classes to `frontend/src/styles.css`**

Find the `/* CHARACTER LEVEL-UP ANIMATION */` section and add the new block directly after it (before the TIER EVOLUTION OVERLAY section):

```css
/* ═══════════════════════════════════════════════════════
   CHARACTER TIER EVOLUTION — SWEEP REVEAL
═══════════════════════════════════════════════════════ */

/* Layer 1 — old image: slight shake 0–0.4s, then fade out 0.4–1.0s */
.char-evo-old {
  animation: charEvoOldOut 1.1s ease-in-out forwards;
  filter: drop-shadow(0 8px 30px rgba(251,191,36,0.4));
}

/* Layer 2 — golden sweep: rises from bottom (0.3s), covers panel (0.9s), exits top (1.1–1.6s) */
.char-evo-sweep {
  background: linear-gradient(
    to top,
    rgba(255,255,255,0.98) 0%,
    rgba(251,191,36,0.95) 40%,
    rgba(255,255,255,0.98) 100%
  );
  animation: charEvoSweep 1.7s cubic-bezier(0.4,0,0.2,1) forwards;
}

/* Layer 3 — new image: hidden until 0.9s, clip-path reveal 0.9–1.6s, glow pulse 1.6–2.2s */
.char-evo-new {
  animation: charEvoNewIn 2.2s ease-out forwards;
  filter: drop-shadow(0 8px 30px rgba(251,191,36,0.4));
}

@keyframes charEvoOldOut {
  0%   { transform: translateX(0);   opacity: 1; }
  6%   { transform: translateX(-6px); }
  12%  { transform: translateX(6px); }
  18%  { transform: translateX(-4px); }
  24%  { transform: translateX(4px); }
  30%  { transform: translateX(0);   opacity: 1; }
  55%  { transform: translateX(0);   opacity: 0.3; }
  100% { transform: translateX(0);   opacity: 0; }
}

@keyframes charEvoSweep {
  0%   { clip-path: inset(100% 0 0 0); opacity: 1; }   /* fully hidden below */
  35%  { clip-path: inset(0% 0 0 0);  opacity: 1; }    /* fully covering panel */
  65%  { clip-path: inset(0% 0 0 0);  opacity: 1; }    /* hold peak */
  100% { clip-path: inset(0 0 100% 0); opacity: 0; }   /* exits upward */
}

@keyframes charEvoNewIn {
  0%   { clip-path: inset(100% 0 0 0); opacity: 1;
         filter: drop-shadow(0 8px 30px rgba(251,191,36,0.4)) brightness(1); }
  40%  { clip-path: inset(100% 0 0 0); opacity: 1; }   /* wait for sweep peak */
  75%  { clip-path: inset(0% 0 0 0);  opacity: 1;
         filter: drop-shadow(0 0 60px rgba(251,191,36,1)) brightness(1.7); }
  88%  { filter: drop-shadow(0 0 40px rgba(251,191,36,0.8)) brightness(1.3); }
  100% { clip-path: inset(0% 0 0 0);  opacity: 1;
         filter: drop-shadow(0 8px 30px rgba(251,191,36,0.4)) brightness(1); }
}
```

- [ ] **Step 3: Verify TypeScript compiles after HTML change**

Run from `frontend/`:
```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Manual test — trigger the animation**

1. Ensure backend is running (`npm run start:dev` from `backend/`)
2. Ensure `ng serve` is running from `frontend/`
3. Reset test data in the DB:
```sql
UPDATE users SET level = 24, "experiencePoints" = 57590
  WHERE email IN ('student1@legendaryclass.com','student15@legendaryclass.com');
UPDATE student_behaviors SET "xpClaimed" = false
  WHERE id IN ('demo-sb-t15-1','demo-sb-t15-2','seed-sb-demo-1','seed-sb-demo-2');
UPDATE quest_students SET "xpClaimed" = false
  WHERE "studentId" IN ('cmqrh7exr000ls0n8820qx67i','cmqrh7evw0007s0n8yjrg4hgu');
```
4. Log in as `student1@legendaryclass.com` (password `password123`)
5. On the dashboard, go to the XP inbox and claim the "Completa 3 tareas seguidas" quest (+150 XP)
6. Tier overlay (VETERANO) appears → click to close
7. **Expected:** page scrolls to character section; old `mago_tier_1.png` shakes briefly, golden sweep rises upward, new `mago_tier_2.png` is revealed from feet upward with a glow pulse
8. **Expected:** after 2.2s the animation finishes and the new image sits normally

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/student/dashboard/student-dashboard.component.html
git add frontend/src/styles.css
git commit -m "feat(anim): tier evolution sweep-reveal animation on character panel"
```
