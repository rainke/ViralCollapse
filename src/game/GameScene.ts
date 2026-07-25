import Phaser from 'phaser'
import { HITBOXES, type SourceCircle } from './collision'
import { getEnemyForLevel, getLevel, type EnemyType } from './content'
import {
  applyDamage,
  applyUpgrade,
  createGameState,
  recordVirusCleaned,
  revivePlayer,
  type GameState,
  type UpgradeId,
} from './model'

const WIDTH = 390
const HEIGHT = 844
const PLAYER_DEATH_DELAY = 700

type EnemySprite = Phaser.Physics.Arcade.Image & {
  enemyType?: EnemyType
}

interface HudDetail {
  hearts: number
  maxHearts: number
  score: number
  level: number
  levelName: string
  progress: number
  weaponLevel: number
  boss?: boolean
}

export class GameScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite
  private player!: Phaser.Physics.Arcade.Image
  private enemies!: Phaser.Physics.Arcade.Group
  private bullets!: Phaser.Physics.Arcade.Group
  private enemyBullets!: Phaser.Physics.Arcade.Group
  private powerups!: Phaser.Physics.Arcade.Group
  private state: GameState = createGameState()
  private started = false
  private paused = false
  private transitioning = false
  private bossActive = false
  private boss?: Phaser.Physics.Arcade.Image
  private bossHealth = 0
  private spawnAt = 0
  private firedAt = 0
  private bossFiredAt = 0
  private damageTaken = 0
  private targetX = WIDTH / 2
  private targetY = HEIGHT - 132

  constructor() {
    super('game')
  }

  preload(): void {
    this.load.image('micro-world', '/assets/generated/micro-world.png')
    this.load.image('guardian', '/assets/generated/guardian.png')
    this.load.image('virus-blue', '/assets/generated/virus-blue.png')
    this.load.image('virus-fast', '/assets/generated/virus-fast.png')
    this.load.image('virus-wobbly', '/assets/generated/virus-wobbly.png')
    this.load.image('virus-splitter', '/assets/generated/virus-splitter.png')
    this.load.image('virus-shield', '/assets/generated/virus-shield.png')
    this.load.image('virus-boss', '/assets/generated/virus-boss.png')
  }

  create(): void {
    this.background = this.add
      .tileSprite(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 'micro-world')
      .setTileScale(0.55)
      .setTint(getLevel(1).tint)

    this.add
      .rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x171147, 0.18)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)

    this.createGeneratedTextures()
    this.enemies = this.physics.add.group({ maxSize: 48 })
    this.bullets = this.physics.add.group({ maxSize: 90 })
    this.enemyBullets = this.physics.add.group({ maxSize: 40 })
    this.powerups = this.physics.add.group({ maxSize: 8 })

    this.player = this.physics.add
      .image(this.targetX, this.targetY, 'guardian')
      .setDisplaySize(96, 144)
      .setDepth(5)
      .setCollideWorldBounds(true)
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.setCircularBody(playerBody, HITBOXES.player)

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this
        .onBulletHitsEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    )
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this
        .onPlayerHitsDanger as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    )
    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      this
        .onPlayerHitsDanger as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    )
    this.physics.add.overlap(
      this.player,
      this.powerups,
      this
        .onCollectPowerup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    )

    this.input.on('pointerdown', this.moveTarget, this)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) this.moveTarget(pointer)
    })

    this.physics.world.pause()
    this.emitEvent('viral:ready')
  }

  begin(): void {
    this.clearWorld()
    this.state = createGameState()
    this.started = true
    this.paused = false
    this.transitioning = false
    this.bossActive = false
    this.damageTaken = 0
    this.targetX = WIDTH / 2
    this.targetY = HEIGHT - 132
    this.player.setPosition(this.targetX, this.targetY).setAlpha(1)
    this.player.setActive(true).setVisible(true)
    this.physics.world.resume()
    this.startLevel(1)
    this.emitEvent('viral:sound', { kind: 'start' })
  }

  update(time: number, delta: number): void {
    if (!this.started || this.paused || this.transitioning) return

    this.background.tilePositionY -= delta * 0.035
    this.player.x = Phaser.Math.Linear(this.player.x, this.targetX, 0.22)
    this.player.y = Phaser.Math.Linear(this.player.y, this.targetY, 0.22)
    this.animateEnemies(time)
    this.cleanupOffscreen()

    const rapidLevel = this.state.upgrades.rapid
    const fireEvery = 390 - rapidLevel * 65
    if (time >= this.firedAt) {
      this.fireAntibodies()
      this.firedAt = time + fireEvery
    }

    if (this.bossActive) {
      this.updateBoss(time)
    } else {
      const level = getLevel(this.state.level)
      if (
        !this.transitioning &&
        this.state.cleaned < level.cleanTarget &&
        time >= this.spawnAt
      ) {
        this.spawnEnemy()
        this.spawnAt = time + level.spawnEvery
      }
      if (
        this.state.cleaned >= level.cleanTarget &&
        this.enemies.countActive(true) === 0
      ) {
        this.completeLevel()
      }
    }
  }

  togglePause(force?: boolean): boolean {
    if (!this.started || this.transitioning) return this.paused
    this.paused = force ?? !this.paused
    if (this.paused) this.physics.world.pause()
    else this.physics.world.resume()
    return this.paused
  }

  chooseUpgrade(upgrade: UpgradeId): void {
    this.state = applyUpgrade(this.state, upgrade)
    this.transitioning = false
    this.physics.world.resume()
    this.emitEvent('viral:sound', { kind: 'power' })

    if (this.state.level < 3) {
      this.startLevel(this.state.level + 1)
    } else {
      this.startBoss()
    }
  }

  revive(): void {
    this.state = revivePlayer(this.state, this.time.now)
    this.player
      .setActive(true)
      .setVisible(true)
      .setAlpha(1)
      .setPosition(WIDTH / 2, HEIGHT - 132)
    this.targetX = WIDTH / 2
    this.targetY = HEIGHT - 132
    this.transitioning = false
    this.physics.world.resume()
    this.emitHud()
    this.emitEvent('viral:toast', { message: '能量满满，继续出发！' })
    this.emitEvent('viral:sound', { kind: 'power' })
  }

  private startLevel(levelNumber: number): void {
    const level = getLevel(levelNumber)
    this.state = {
      ...this.state,
      level: level.id,
      cleaned: 0,
    }
    this.background.setTint(level.tint)
    this.spawnAt = this.time.now + 900
    this.transitioning = false
    this.emitHud()
    this.emitEvent('viral:toast', {
      message: `第 ${level.id} 关 · ${level.name}`,
    })
  }

  private spawnEnemy(): void {
    const level = getLevel(this.state.level)
    const type = getEnemyForLevel(level.id, Math.random())
    const texture = {
      basic: 'virus-blue',
      fast: 'virus-fast',
      wobbly: 'virus-wobbly',
      splitter: 'virus-splitter',
      tough: 'virus-shield',
    }[type]
    const enemy = this.enemies.get(
      Phaser.Math.Between(48, WIDTH - 48),
      -70,
      texture,
    ) as EnemySprite | null
    if (!enemy) return

    const config = {
      basic: {
        health: 1,
        points: 10,
        scale: [68, 102],
        speed: 1,
        amplitude: 42,
      },
      fast: {
        health: 1,
        points: 18,
        scale: [56, 84],
        speed: 1.65,
        amplitude: 28,
      },
      wobbly: {
        health: 2,
        points: 22,
        scale: [74, 111],
        speed: 0.92,
        amplitude: 76,
      },
      splitter: {
        health: 2,
        points: 28,
        scale: [84, 126],
        speed: 0.86,
        amplitude: 34,
      },
      tough: {
        health: 4,
        points: 40,
        scale: [86, 129],
        speed: 0.72,
        amplitude: 24,
      },
    }[type]

    enemy
      .setActive(true)
      .setVisible(true)
      .setTexture(texture)
      .setDisplaySize(config.scale[0], config.scale[1])
      .setDepth(3)
      .setAlpha(0)
      .setDataEnabled()
    enemy.enemyType = type
    enemy.setData({
      health: config.health,
      points: config.points,
      speed: level.enemySpeed * config.speed,
      originX: enemy.x,
      wave: Phaser.Math.FloatBetween(0.0015, 0.0032),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      amplitude: config.amplitude,
    })
    enemy.clearTint()

    const body = enemy.body as Phaser.Physics.Arcade.Body
    body.enable = true
    this.setCircularBody(body, HITBOXES[type])
    body.setVelocityY(enemy.getData('speed') as number)
    this.tweens.add({
      targets: enemy,
      alpha: 1,
      duration: 180,
    })
  }

  private animateEnemies(time: number): void {
    for (const item of this.enemies.getChildren()) {
      const enemy = item as EnemySprite
      if (!enemy.active) continue
      const wave = enemy.getData('wave') as number
      const phase = enemy.getData('phase') as number
      const originX = enemy.getData('originX') as number
      const amplitude = (enemy.getData('amplitude') as number | undefined) ?? 42
      enemy.x = Phaser.Math.Clamp(
        originX + Math.sin(time * wave + phase) * amplitude,
        34,
        WIDTH - 34,
      )
      enemy.angle += enemy.enemyType === 'fast' ? 0.7 : 0.2
    }
  }

  private fireAntibodies(): void {
    const spreadLevel = this.state.upgrades.spread
    const angles = spreadLevel === 0 ? [0] : spreadLevel === 1 ? [-9, 9] : [-16, 0, 16]

    for (const angle of angles) {
      const bullet = this.bullets.get(
        this.player.x,
        this.player.y - 45,
        'antibody',
      ) as Phaser.Physics.Arcade.Image | null
      if (!bullet) continue
      bullet
        .setActive(true)
        .setVisible(true)
        .setDepth(4)
        .setScale(1)
        .setAlpha(1)
      const body = bullet.body as Phaser.Physics.Arcade.Body
      body.enable = true
      body.setSize(14, 20)
      this.physics.velocityFromAngle(angle - 90, 470, body.velocity)
    }
    this.emitEvent('viral:sound', { kind: 'pop', quiet: true })
  }

  private onBulletHitsEnemy(
    bulletObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const bullet = bulletObject as Phaser.Physics.Arcade.Image
    const enemy = enemyObject as EnemySprite
    this.disableObject(bullet)

    if (enemy === this.boss) {
      this.hitBoss(enemy)
      return
    }

    const health = (enemy.getData('health') as number) - 1
    enemy.setData('health', health)
    if (health > 0) {
      this.tweens.add({
        targets: enemy,
        alpha: 0.45,
        yoyo: true,
        duration: 70,
      })
      return
    }

    const points = enemy.getData('points') as number
    const shouldSplit = enemy.enemyType === 'splitter'
    this.state = recordVirusCleaned(this.state, points)
    const x = enemy.x
    const y = enemy.y
    this.disableObject(enemy)
    this.cleanBurst(x, y)
    if (shouldSplit) this.spawnSplitFragments(x, y)
    this.maybeDropPowerup(x, y)
    this.emitHud()
    this.emitEvent('viral:sound', { kind: 'clean' })
  }

  private hitBoss(boss: Phaser.Physics.Arcade.Image): void {
    this.bossHealth -= 1
    boss.setTintFill(0xffffff)
    this.time.delayedCall(60, () => boss.clearTint())
    this.cleanBurst(
      boss.x + Phaser.Math.Between(-60, 60),
      boss.y + Phaser.Math.Between(-40, 55),
      0x70f5ff,
      5,
    )
    this.emitHud()

    if (this.bossHealth <= 0) {
      this.bossActive = false
      this.disableObject(boss)
      this.enemyBullets.clear(true, true)
      this.state = {
        ...this.state,
        score: this.state.score + 1_000,
      }
      for (let index = 0; index < 8; index += 1) {
        this.time.delayedCall(index * 110, () => {
          this.cleanBurst(
            Phaser.Math.Between(80, WIDTH - 80),
            Phaser.Math.Between(120, 390),
            index % 2 ? 0xffef78 : 0x74efff,
            14,
          )
        })
      }
      this.time.delayedCall(1_050, () => this.finishRun())
      this.emitEvent('viral:sound', { kind: 'win' })
    }
  }

  private onPlayerHitsDanger(
    playerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    dangerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const player = playerObject as Phaser.Physics.Arcade.Image
    const danger = dangerObject as Phaser.Physics.Arcade.Image
    if (danger !== this.boss) this.disableObject(danger)
    const next = applyDamage(this.state, this.time.now)
    if (next === this.state) return

    this.state = next
    this.damageTaken += 1
    this.cameras.main.shake(160, 0.008)
    this.emitHud()
    this.emitEvent('viral:sound', {
      kind: this.state.hearts === 0 ? 'death' : 'hit',
    })

    if (this.state.hearts === 0) {
      this.transitioning = true
      this.physics.world.pause()
      this.explodePlayer(player)
      this.time.delayedCall(PLAYER_DEATH_DELAY, () =>
        this.emitEvent('viral:revive'),
      )
      return
    }

    player.setTintFill(0xffffff)
    this.tweens.add({
      targets: player,
      alpha: 0.25,
      yoyo: true,
      repeat: 5,
      duration: 90,
      onComplete: () => {
        player.clearTint()
        player.setAlpha(1)
      },
    })
  }

  private maybeDropPowerup(x: number, y: number): void {
    if (Math.random() > 0.12) return
    const kinds = ['heart', 'rapid', 'shield'] as const
    const kind = kinds[Phaser.Math.Between(0, kinds.length - 1)]
    const texture = kind === 'heart' ? 'heart' : kind === 'rapid' ? 'bolt' : 'bubble'
    const powerup = this.powerups.get(x, y, texture) as
      | Phaser.Physics.Arcade.Image
      | null
    if (!powerup) return
    powerup
      .setActive(true)
      .setVisible(true)
      .setTexture(texture)
      .setData('kind', kind)
      .setDepth(4)
    const body = powerup.body as Phaser.Physics.Arcade.Body
    body.enable = true
    body.setVelocityY(95)
  }

  private onCollectPowerup(
    _playerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    powerupObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const powerup = powerupObject as Phaser.Physics.Arcade.Image
    const kind = powerup.getData('kind') as 'heart' | 'rapid' | 'shield'
    this.disableObject(powerup)
    if (kind === 'heart') {
      this.state = {
        ...this.state,
        hearts: Math.min(this.state.maxHearts, this.state.hearts + 1),
      }
    } else {
      this.state = applyUpgrade(this.state, kind)
    }
    this.emitHud()
    this.emitEvent('viral:toast', {
      message: kind === 'heart' ? '爱心能量 +1' : '抗体能量升级！',
    })
    this.emitEvent('viral:sound', { kind: 'power' })
  }

  private completeLevel(): void {
    this.transitioning = true
    this.physics.world.pause()
    const level = getLevel(this.state.level)
    this.emitEvent('viral:levelComplete', {
      level: level.id,
      fact: level.fact,
      bossNext: level.id === 3,
    })
    this.emitEvent('viral:sound', { kind: 'level' })
  }

  private startBoss(): void {
    this.transitioning = false
    this.bossActive = true
    this.enemies.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.bossHealth = 48
    this.background.setTint(0xd9c9ff)
    this.boss = this.physics.add
      .image(WIDTH / 2, 170, 'virus-boss')
      .setDisplaySize(205, 308)
      .setDepth(3)
      .setData('boss', true)
    const body = this.boss.body as Phaser.Physics.Arcade.Body
    this.setCircularBody(body, HITBOXES.boss)
    body.setImmovable(true)
    this.enemies.add(this.boss)
    this.emitEvent('viral:toast', { message: '最终挑战 · 病毒泡泡王' })
    this.emitHud()
  }

  private updateBoss(time: number): void {
    if (!this.boss?.active) return
    this.boss.x = WIDTH / 2 + Math.sin(time * 0.0012) * 115
    if (time < this.bossFiredAt) return

    const healthRatio = this.bossHealth / 48
    const shotCount = healthRatio > 0.66 ? 1 : healthRatio > 0.33 ? 3 : 5
    const startAngle = shotCount === 1 ? 90 : 72
    const step = shotCount === 1 ? 0 : 36 / (shotCount - 1)
    for (let index = 0; index < shotCount; index += 1) {
      const shot = this.enemyBullets.get(
        this.boss.x,
        this.boss.y + 76,
        'germ-drop',
      ) as Phaser.Physics.Arcade.Image | null
      if (!shot) continue
      shot.setActive(true).setVisible(true).setDepth(4)
      const shotBody = shot.body as Phaser.Physics.Arcade.Body
      shotBody.enable = true
      this.physics.velocityFromAngle(
        startAngle + step * index,
        135 + (1 - healthRatio) * 55,
        shotBody.velocity,
      )
    }
    this.bossFiredAt = time + 1_180 - (1 - healthRatio) * 380
    this.emitEvent('viral:sound', { kind: 'boss', quiet: true })
  }

  private finishRun(): void {
    this.transitioning = true
    this.physics.world.pause()
    const stars = this.damageTaken <= 2 ? 3 : this.damageTaken <= 5 ? 2 : 1
    this.emitHud()
    this.emitEvent('viral:victory', {
      score: this.state.score,
      stars,
      cleaned: this.state.cleaned,
    })
  }

  private emitHud(): void {
    const level = getLevel(this.state.level)
    const detail: HudDetail = {
      hearts: this.state.hearts,
      maxHearts: this.state.maxHearts,
      score: this.state.score,
      level: this.state.level,
      levelName: this.bossActive ? '病毒泡泡王' : level.name,
      progress: this.bossActive
        ? Phaser.Math.Clamp(1 - this.bossHealth / 48, 0, 1)
        : Phaser.Math.Clamp(this.state.cleaned / level.cleanTarget, 0, 1),
      weaponLevel:
        1 + this.state.upgrades.rapid + this.state.upgrades.spread,
      boss: this.bossActive,
    }
    this.emitEvent('viral:hud', detail)
  }

  private moveTarget(pointer: Phaser.Input.Pointer): void {
    if (!this.started || this.paused || this.transitioning) return
    this.targetX = Phaser.Math.Clamp(pointer.x, 45, WIDTH - 45)
    this.targetY = Phaser.Math.Clamp(pointer.y - 62, 160, HEIGHT - 76)
  }

  private cleanupOffscreen(): void {
    const groups = [this.enemies, this.bullets, this.enemyBullets, this.powerups]
    for (const group of groups) {
      for (const child of group.getChildren()) {
        const object = child as Phaser.Physics.Arcade.Image
        if (
          object.active &&
          object !== this.boss &&
          (object.y < -150 || object.y > HEIGHT + 120)
        ) {
          this.disableObject(object)
        }
      }
    }
  }

  private clearWorld(): void {
    this.enemies?.clear(true, true)
    this.bullets?.clear(true, true)
    this.enemyBullets?.clear(true, true)
    this.powerups?.clear(true, true)
    this.boss = undefined
  }

  private disableObject(object: Phaser.Physics.Arcade.Image): void {
    const body = object.body as Phaser.Physics.Arcade.Body | null
    if (body) body.enable = false
    object.setActive(false).setVisible(false)
  }

  private cleanBurst(
    x: number,
    y: number,
    color = 0xfff27d,
    count = 8,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const dot = this.add
        .circle(x, y, Phaser.Math.Between(3, 7), color, 0.9)
        .setDepth(8)
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-55, 55),
        y: y + Phaser.Math.Between(-55, 55),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(300, 560),
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      })
    }
  }

  private explodePlayer(player: Phaser.Physics.Arcade.Image): void {
    const effect = this.add
      .container(player.x, player.y)
      .setName('player-death-effect')
      .setDepth(9)
    const glow = this.add
      .circle(0, 0, 52, 0x71edff, 0.4)
      .setScale(0.35)
    const core = this.add.circle(0, 0, 24, 0xffffff, 0.95)
    const ring = this.add
      .circle(0, 0, 34, 0xffee79, 0)
      .setStrokeStyle(7, 0xffee79, 0.95)
      .setScale(0.5)
    effect.add([glow, core, ring])

    const colors = [0x70efff, 0xffef78, 0xffffff, 0xa68bff]
    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18
      const distance = Phaser.Math.Between(62, 116)
      const fragment = this.add
        .triangle(
          0,
          0,
          -Phaser.Math.Between(3, 6),
          6,
          0,
          -Phaser.Math.Between(7, 13),
          Phaser.Math.Between(3, 6),
          6,
          colors[index % colors.length],
          1,
        )
        .setAngle(Phaser.Math.RadToDeg(angle) + 90)
      effect.add(fragment)
      this.tweens.add({
        targets: fragment,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        angle: fragment.angle + Phaser.Math.Between(-100, 100),
        alpha: 0,
        scale: 0.25,
        duration: Phaser.Math.Between(420, 650),
        ease: 'Cubic.easeOut',
      })
    }

    this.tweens.add({
      targets: glow,
      scale: 2.1,
      alpha: 0,
      duration: 480,
      ease: 'Cubic.easeOut',
    })
    this.tweens.add({
      targets: core,
      scale: 2.5,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
    })
    this.tweens.add({
      targets: ring,
      scale: 2.3,
      alpha: 0,
      duration: 560,
      ease: 'Cubic.easeOut',
    })

    const scaleX = player.scaleX
    const scaleY = player.scaleY
    this.tweens.killTweensOf(player)
    player.setTintFill(0xffffff)
    this.tweens.add({
      targets: player,
      alpha: 0,
      scaleX: scaleX * 1.18,
      scaleY: scaleY * 1.18,
      duration: 150,
      ease: 'Back.easeIn',
      onComplete: () => {
        player
          .setActive(false)
          .setVisible(false)
          .setAlpha(1)
          .setScale(scaleX, scaleY)
          .clearTint()
      },
    })

    this.time.delayedCall(PLAYER_DEATH_DELAY, () => effect.destroy(true))
  }

  private spawnSplitFragments(x: number, y: number): void {
    for (const direction of [-1, 1]) {
      const fragment = this.enemies.get(
        x + direction * 24,
        y,
        'virus-splitter',
      ) as EnemySprite | null
      if (!fragment) continue

      fragment
        .setActive(true)
        .setVisible(true)
        .setTexture('virus-splitter')
        .setDisplaySize(44, 66)
        .setDepth(3)
        .setAlpha(1)
        .setDataEnabled()
      fragment.enemyType = 'basic'
      fragment.setData({
        health: 1,
        points: 6,
        speed: 148,
        originX: fragment.x,
        wave: 0.004,
        phase: direction > 0 ? 0 : Math.PI,
        amplitude: 30,
      })
      const body = fragment.body as Phaser.Physics.Arcade.Body
      body.enable = true
      this.setCircularBody(body, HITBOXES.splitter)
      body.setVelocityY(148)
    }
  }

  private setCircularBody(
    body: Phaser.Physics.Arcade.Body,
    hitbox: SourceCircle,
  ): void {
    body.setCircle(
      hitbox.radius,
      hitbox.centerX - hitbox.radius,
      hitbox.centerY - hitbox.radius,
    )
  }

  private createGeneratedTextures(): void {
    if (this.textures.exists('antibody')) return
    const graphics = this.make.graphics({ x: 0, y: 0 }, false)
    graphics.fillStyle(0x7df6ff, 1)
    graphics.fillRoundedRect(5, 0, 10, 24, 5)
    graphics.fillStyle(0xffffff, 0.8)
    graphics.fillCircle(10, 5, 3)
    graphics.generateTexture('antibody', 20, 26)
    graphics.clear()
    graphics.fillStyle(0xa26eff, 1)
    graphics.fillCircle(12, 12, 10)
    graphics.fillStyle(0xffffff, 0.65)
    graphics.fillCircle(9, 8, 3)
    graphics.generateTexture('germ-drop', 24, 24)
    graphics.clear()
    graphics.fillStyle(0xff6f91, 1)
    graphics.fillCircle(9, 9, 8)
    graphics.fillCircle(19, 9, 8)
    graphics.fillTriangle(2, 12, 26, 12, 14, 28)
    graphics.generateTexture('heart', 28, 30)
    graphics.clear()
    graphics.fillStyle(0xffe26d, 1)
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(16, 0),
        new Phaser.Geom.Point(5, 18),
        new Phaser.Geom.Point(14, 18),
        new Phaser.Geom.Point(8, 34),
        new Phaser.Geom.Point(28, 13),
        new Phaser.Geom.Point(18, 13),
      ],
      true,
    )
    graphics.generateTexture('bolt', 34, 36)
    graphics.clear()
    graphics.lineStyle(4, 0x70efff, 1)
    graphics.strokeCircle(19, 19, 15)
    graphics.fillStyle(0xffffff, 0.28)
    graphics.fillCircle(19, 19, 13)
    graphics.generateTexture('bubble', 38, 38)
    graphics.destroy()
  }

  private emitEvent(name: string, detail?: unknown): void {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }
}
