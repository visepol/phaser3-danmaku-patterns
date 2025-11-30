# Remilia NonSpell1A: TShot1

This document explains the design and math behind the `TShot1` attack pattern implemented in `src/scenes/Remilia/NonSpell1A/TShot1.ts`.

## Overview
- Boss emits multiple revolutions of shots.
- Each revolution has a fixed number of shots equally spaced by angle.
- For every shot, several bullets are spawned with different speeds.

## Parameters
From the code:
```ts
const atk = {
  repeat: 5,
  pattern: {
    shotsPerRevolution: 60,
    timeBetweenShots: 0,
    pauseBetweenRevolutions: 500,
    bulletsPerShot: [{ speed: 150 }, { speed: 200 }, { speed: 250 }],
    angle: { incrementPerShot: 360 / 60, relativeToPlayer: false }
  }
} as const;
```
- `repeat`: number of revolutions.
- `shotsPerRevolution`: shots per revolution (angular resolution).
- `timeBetweenShots`: delay between shots within a revolution (ms).
- `pauseBetweenRevolutions`: delay between revolutions (ms).
- `bulletsPerShot`: bullet speeds for each shot.
- `incrementPerShot`: angular step in degrees between consecutive shots.
- `relativeToPlayer`: whether shots are aimed relative to the player angle (here `false`).

## Aiming and Angle Computation
For each shot index `i`:
1. Base incremental angle per shot:
  - $\Delta = \frac{360}{\text{shotsPerRevolution}} = 6^\circ$ (60 \* 6° = 360° completa uma volta)
  - $\alpha_i = i \cdot \Delta$
2. Final shot angle (degrees):
  - $\alpha_{\text{final}} = \alpha_i$ \quad (optionally plus a fixed offset $\alpha_0$ if desired)

This produces a pure radial wheel: evenly spaced spokes that do not track the player.

## Bullet Velocity
Each bullet is spawned with speed `s` and angle $\alpha_{\text{final}}$. Convert degrees to radians and use cosine/sine to get velocity components:
- $\theta = \text{deg2rad}(\alpha_{\text{final}})$
- $v_x = s \cdot \cos(\theta)$
- $v_y = s \cdot \sin(\theta)$

In code:
```ts
(bullet as any).vx = Math.cos(Phaser.Math.DegToRad(finalAngle)) * speed;
(bullet as any).vy = Math.sin(Phaser.Math.DegToRad(finalAngle)) * speed;
```

## Motion Integration
Position updates use a fixed time step approximation with $\Delta t = \tfrac{1}{60}$ seconds:
- $x \leftarrow x + v_x \cdot \Delta t$
- $y \leftarrow y + v_y \cdot \Delta t$

In code:
```ts
const dt = 1 / 60;
this.bullets.getChildren().forEach((b: any) => {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
});
```

## Timing
- If `timeBetweenShots > 0`, the pattern waits between shots (uniform cadence).
- After completing a revolution, it waits `pauseBetweenRevolutions` milliseconds, creating a pulsed emission pattern.

## Visual Summary
- 60 shots per revolution yields a $6^\circ$ spacing.
- Three speeds per shot generate concentric rings propagating outward.
- Absolute aiming (not player-relative) creates symmetric wheels centered on the boss.

## References (Phaser)
- `Phaser.Math.Angle.Between(x1, y1, x2, y2)` → returns radians angle.
- `Phaser.Math.RadToDeg(rad)` / `Phaser.Math.DegToRad(deg)` for conversion.
- `Phaser.GameObjects.Group` for bullet management.
