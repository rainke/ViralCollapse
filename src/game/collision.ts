export interface SourceCircle {
  radius: number
  centerX: number
  centerY: number
}

export const SOURCE_WIDTH = 1024

export const HITBOXES = {
  player: { radius: 250, centerX: 512, centerY: 750 },
  basic: { radius: 340, centerX: 512, centerY: 750 },
  fast: { radius: 300, centerX: 512, centerY: 760 },
  wobbly: { radius: 330, centerX: 512, centerY: 780 },
  splitter: { radius: 330, centerX: 512, centerY: 770 },
  tough: { radius: 350, centerX: 512, centerY: 780 },
  boss: { radius: 360, centerX: 512, centerY: 760 },
} satisfies Record<string, SourceCircle>

export function getScaledCircle(
  circle: SourceCircle,
  displayWidth: number,
): SourceCircle {
  const scale = displayWidth / SOURCE_WIDTH
  return {
    radius: circle.radius * scale,
    centerX: circle.centerX * scale,
    centerY: circle.centerY * scale,
  }
}

export function projectileTravelPerFrame(
  speed: number,
  framesPerSecond: number,
): number {
  return speed / framesPerSecond
}
