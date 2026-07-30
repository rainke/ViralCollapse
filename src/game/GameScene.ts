import Phaser from 'phaser'
import { HITBOXES, type SourceCircle } from './collision'
import {
  getEnemyForLevel,
  getLevel,
  type BossConfig,
  type EnemyType,
} from './content'
import {
  getBossStats,
  getEnemyStats,
  getLevelPosition,
  getLevelStats,
} from './balance'
import {
  advanceToLevel,
  applyDamage,
  applyUpgrade,
  calculateBulletDamage,
  chooseUpgradeOptions,
  createGameState,
  getBulletPattern,
  getChapterStars,
  getFireInterval,
  getPlayerCombatStats,
  getProjectilePierceCount,
  getSplitProjectiles,
  healPlayer,
  recordVirusCleaned,
  restartCurrentLevel,
  revivePlayer,
  shouldDropSkillFragment,
  type GameState,
  type RunSave,
  type UpgradeId,
} from './model'

const WIDTH = 390
const HEIGHT = 844
const PLAYER_DEATH_DELAY = 700

type EnemySprite = Phaser.Physics.Arcade.Image & {
  enemyType?: EnemyType
}

interface HudDetail {
  health: number
  maxHealth: number
  score: number
  level: number
  battleLevel: number
  levelName: string
  progress: number
  damage: number
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
  private upgradeChoiceSource: 'level' | 'fragment' = 'level'
  private bossActive = false
  private boss?: Phaser.Physics.Arcade.Image
  private bossConfig?: BossConfig
  private bossHealth = 0
  private bossMaxHealth = 0
  private spawnAt = 0
  private firedAt = 0
  private bossFiredAt = 0
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
    this.load.image('virus-influenza', '/assets/generated/virus-influenza.png')
    this.load.image('virus-adenovirus', '/assets/generated/virus-adenovirus.png')
    this.load.image('virus-rabies', '/assets/generated/virus-rabies.png')
    this.load.image('virus-pox', '/assets/generated/virus-pox.png')
    this.load.image('virus-polyhedral', '/assets/generated/virus-polyhedral.png')
    this.load.image('virus-wide-mouth', '/assets/generated/virus-wide-mouth.png')
    this.load.image('virus-ebola-boss', '/assets/generated/virus-ebola-boss.png')
    this.load.image('virus-corona-boss', '/assets/generated/virus-boss.png')
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

  begin(run?: RunSave): void {
    this.clearWorld()
    if (run) {
      const initial = createGameState(run.worldLevel, run.runSeed)
      this.state = {
        ...initial,
        health: Math.min(run.health, run.maxHealth),
        maxHealth: run.maxHealth,
        score: run.score,
        levelStartScore: run.score,
        battleLevel: run.battleLevel,
        upgrades: { ...initial.upgrades, ...run.upgrades },
        deaths: run.deaths,
        pendingUpgrades: run.pendingUpgrades,
      }
    } else {
      this.state = createGameState()
    }
    this.started = true
    this.paused = false
    this.transitioning = false
    this.upgradeChoiceSource = 'level'
    this.bossActive = false
    this.targetX = WIDTH / 2
    this.targetY = HEIGHT - 132
    this.player.setPosition(this.targetX, this.targetY).setAlpha(1)
    this.player.setActive(true).setVisible(true)
    this.physics.world.resume()
    if (this.state.pendingUpgrades?.length) {
      this.restorePendingUpgrade()
    } else {
      this.startLevel(this.state.worldLevel)
    }
    this.emitEvent('viral:sound', { kind: 'start' })
  }

  update(time: number, delta: number): void {
    if (!this.started || this.paused || this.transitioning) return

    this.background.tilePositionY -= delta * 0.035
    this.player.x = Phaser.Math.Linear(this.player.x, this.targetX, 0.22)
    this.player.y = Phaser.Math.Linear(this.player.y, this.targetY, 0.22)
    this.animateEnemies(time)
    this.cleanupOffscreen()

    if (time >= this.firedAt) {
      this.fireAntibodies()
      this.firedAt = time + getFireInterval(this.state, time)
    }

    if (this.bossActive) {
      this.updateBoss(time)
    } else {
      const levelStats = getLevelStats(this.state.worldLevel)
      if (
        !this.transitioning &&
        this.state.cleaned < levelStats.cleanTarget &&
        time >= this.spawnAt
      ) {
        this.spawnEnemy()
        this.spawnAt = time + levelStats.spawnEvery
      }
      if (
        this.state.cleaned >= levelStats.cleanTarget &&
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
    if (!this.state.pendingUpgrades?.includes(upgrade)) return
    this.state = applyUpgrade(this.state, upgrade)
    this.emitEvent('viral:sound', { kind: 'power' })
    if (this.upgradeChoiceSource === 'fragment') {
      this.state = { ...this.state, pendingUpgrades: undefined }
      this.transitioning = false
      this.physics.world.resume()
      this.emitHud()
      this.emitCheckpoint()
      this.emitEvent('viral:toast', {
        message: '技能强化成功，继续净化！',
      })
      return
    }
    this.startLevel(this.state.worldLevel + 1, true)
  }

  revive(): void {
    const restart = this.state.reviveUsed
    this.state = restart
      ? restartCurrentLevel(this.state)
      : revivePlayer(this.state, this.time.now)
    if (restart) {
      this.clearWorld()
      this.startLevel(this.state.worldLevel)
    }
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
    this.emitCheckpoint()
    this.emitEvent('viral:toast', {
      message: restart ? '本关重新开始，加油！' : '能量满满，继续出发！',
    })
    this.emitEvent('viral:sound', { kind: 'power' })
  }

  private startLevel(levelNumber: number, advance = false): void {
    if (advance) {
      this.state = advanceToLevel(this.state, levelNumber)
    }
    const level = getLevel(levelNumber)
    this.state = {
      ...this.state,
      worldLevel: levelNumber,
      battleLevel: getLevelPosition(levelNumber).battleLevel,
      cleaned: 0,
      pendingUpgrades: undefined,
      levelStartScore: this.state.score,
    }
    this.upgradeChoiceSource = 'level'
    this.background.setTint(level.tint)
    this.spawnAt = this.time.now + 900
    this.transitioning = false
    this.bossActive = false
    this.physics.world.resume()
    this.emitCheckpoint()
    if (level.boss) {
      this.startBoss(level.boss)
      return
    }
    this.emitHud()
    this.emitEvent('viral:toast', {
      message: `第 ${levelNumber} 关 · ${level.name}`,
    })
  }

  private spawnEnemy(): void {
    const type = getEnemyForLevel(this.state.worldLevel, Math.random())
    const texture = {
      basic: 'virus-blue',
      fast: 'virus-fast',
      wobbly: 'virus-wobbly',
      splitter: 'virus-splitter',
      tough: 'virus-shield',
      influenza: 'virus-influenza',
      adenovirus: 'virus-adenovirus',
      rabies: 'virus-rabies',
      pox: 'virus-pox',
      polyhedral: 'virus-polyhedral',
      wideMouth: 'virus-wide-mouth',
    }[type]
    const enemyStats = getEnemyStats(this.state.worldLevel, type)
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
      influenza: {
        health: 2,
        points: 30,
        scale: [78, 117],
        speed: 1.04,
        amplitude: 48,
      },
      adenovirus: {
        health: 4,
        points: 44,
        scale: [84, 126],
        speed: 0.76,
        amplitude: 20,
      },
      rabies: {
        health: 1,
        points: 24,
        scale: [72, 108],
        speed: 1.35,
        amplitude: 60,
      },
      pox: {
        health: 3,
        points: 34,
        scale: [82, 123],
        speed: 0.78,
        amplitude: 18,
      },
      polyhedral: {
        health: 3,
        points: 38,
        scale: [88, 132],
        speed: 0.82,
        amplitude: 26,
      },
      wideMouth: {
        health: 4,
        points: 46,
        scale: [80, 120],
        speed: 0.7,
        amplitude: 36,
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
      health: enemyStats.health,
      damage: enemyStats.damage,
      points: enemyStats.points,
      speed: enemyStats.speed,
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
    const critical =
      Math.random() < getPlayerCombatStats(this.state).criticalChance
    for (const shot of getBulletPattern(this.state)) {
      const bullet = this.bullets.get(
        this.player.x,
        this.player.y - 45,
        'antibody',
      ) as Phaser.Physics.Arcade.Image | null
      if (!bullet) continue
      bullet
        .setActive(true)
        .setVisible(true)
        .setTexture('antibody')
        .setDepth(4)
        .setScale(1)
        .setAngle(shot.angle)
        .setAlpha(1)
        .clearTint()
      const body = bullet.body as Phaser.Physics.Arcade.Body
      body.enable = true
      body.setSize(14, 20)
      bullet.setData({
        damage: calculateBulletDamage(
          this.state,
          shot.damageMultiplier,
          critical,
        ),
        remainingPierces: getProjectilePierceCount(this.state),
        splitChild: false,
        hitTargets: new Set<EnemySprite>(),
      })
      this.physics.velocityFromAngle(shot.angle - 90, 470, body.velocity)
    }
    this.emitEvent('viral:sound', { kind: 'pop', quiet: true })
  }

  private onBulletHitsEnemy(
    bulletObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const bullet = bulletObject as Phaser.Physics.Arcade.Image
    const enemy = enemyObject as EnemySprite
    const hitTargets =
      (bullet.getData('hitTargets') as Set<EnemySprite> | undefined) ??
      new Set<EnemySprite>()
    if (hitTargets.has(enemy)) return
    hitTargets.add(enemy)
    bullet.setData('hitTargets', hitTargets)

    const damage =
      (bullet.getData('damage') as number | undefined) ??
      getPlayerCombatStats(this.state).damage
    if (bullet.getData('splitChild') !== true) {
      this.spawnSplitAntibodies(bullet.x, bullet.y, damage, enemy)
    }

    const remainingPierces =
      (bullet.getData('remainingPierces') as number | undefined) ?? 0
    if (remainingPierces > 0) {
      bullet.setData('remainingPierces', remainingPierces - 1)
    } else {
      this.disableObject(bullet)
    }

    if (enemy === this.boss) {
      this.hitBoss(enemy, damage)
      return
    }

    const health =
      (enemy.getData('health') as number) - damage
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
    this.maybeDropSkillFragment(x, y)
    this.emitHud()
    this.emitEvent('viral:sound', { kind: 'clean' })
  }

  private hitBoss(
    boss: Phaser.Physics.Arcade.Image,
    damage: number,
  ): void {
    this.bossHealth -= damage
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
      this.transitioning = true
      this.enemies.remove(boss, true, true)
      this.boss = undefined
      this.enemyBullets.clear(true, true)
      this.state = {
        ...this.state,
        score: this.state.score + (this.bossConfig?.points ?? 0),
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
      const finalBoss = getLevelPosition(this.state.worldLevel).stage === 10
      this.time.delayedCall(1_050, () => {
        if (finalBoss) this.finishRun()
        else this.completeLevel()
      })
      this.emitEvent('viral:sound', {
        kind: finalBoss ? 'win' : 'level',
      })
    }
  }

  private onPlayerHitsDanger(
    playerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    dangerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const player = playerObject as Phaser.Physics.Arcade.Image
    const danger = dangerObject as Phaser.Physics.Arcade.Image
    if (danger !== this.boss) this.disableObject(danger)
    const damage =
      (danger.getData('damage') as number | undefined) ??
      getBossStats(
        this.state.worldLevel,
        this.bossConfig?.type ?? 'corona',
      ).damage
    const next = applyDamage(this.state, damage, this.time.now)
    if (next === this.state) return

    this.state = next
    this.cameras.main.shake(160, 0.008)
    this.emitHud()
    this.emitEvent('viral:sound', {
      kind: this.state.health === 0 ? 'death' : 'hit',
    })

    if (this.state.health === 0) {
      this.transitioning = true
      this.physics.world.pause()
      this.explodePlayer(player)
      this.time.delayedCall(PLAYER_DEATH_DELAY, () =>
        this.emitEvent('viral:revive', {
          restart: this.state.reviveUsed,
        }),
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

  private maybeDropSkillFragment(x: number, y: number): void {
    if (!shouldDropSkillFragment(Math.random())) return
    const fragment = this.powerups.get(x, y, 'skill-fragment') as
      | Phaser.Physics.Arcade.Image
      | null
    if (!fragment) return
    fragment
      .setActive(true)
      .setVisible(true)
      .setTexture('skill-fragment')
      .setData('kind', 'skill')
      .setDepth(4)
    const body = fragment.body as Phaser.Physics.Arcade.Body
    body.enable = true
    body.setVelocityY(75)
  }

  private onCollectPowerup(
    _playerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    powerupObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const powerup = powerupObject as Phaser.Physics.Arcade.Image
    const kind = powerup.getData('kind') as
      | 'heart'
      | 'rapid'
      | 'shield'
      | 'skill'
    this.disableObject(powerup)
    if (kind === 'skill') {
      this.showSkillFragmentChoice()
      return
    }
    if (kind === 'heart') {
      this.state = healPlayer(this.state)
    } else if (kind === 'rapid') {
      this.state = {
        ...this.state,
        rapidBoostUntil: this.time.now + 6_000,
      }
    } else {
      this.state = {
        ...this.state,
        damageImmunityCharges: 1,
      }
    }
    this.emitHud()
    this.emitEvent('viral:toast', {
      message:
        kind === 'heart'
          ? '恢复 20% 生命'
          : kind === 'rapid'
            ? '短时攻速提升！'
            : '获得一次伤害免疫！',
    })
    this.emitEvent('viral:sound', { kind: 'power' })
  }

  private showSkillFragmentChoice(): void {
    const options = chooseUpgradeOptions(
      this.state.upgrades,
      this.state.runSeed + this.state.score + this.state.cleaned,
    )
    if (options.length === 0) {
      this.emitEvent('viral:toast', {
        message: '所有技能都已经满级啦！',
      })
      return
    }
    this.state = { ...this.state, pendingUpgrades: options }
    this.upgradeChoiceSource = 'fragment'
    this.transitioning = true
    this.physics.world.pause()
    this.emitEvent('viral:skillFragment', { options })
    this.emitEvent('viral:sound', { kind: 'power' })
  }

  private completeLevel(): void {
    this.transitioning = true
    this.upgradeChoiceSource = 'level'
    this.physics.world.pause()
    const level = getLevel(this.state.worldLevel)
    const options =
      this.state.pendingUpgrades ??
      chooseUpgradeOptions(
        this.state.upgrades,
        this.state.runSeed + this.state.worldLevel,
      )
    this.state = { ...this.state, pendingUpgrades: options }
    this.emitCheckpoint()
    this.emitEvent('viral:levelComplete', {
      level: this.state.worldLevel,
      fact: level.fact,
      bossNext:
        getLevel(this.state.worldLevel + 1).mode === 'boss',
      options,
    })
    this.emitEvent('viral:sound', { kind: 'level' })
  }

  private startBoss(config: BossConfig): void {
    this.transitioning = false
    this.bossActive = true
    this.enemies.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.bossConfig = config
    const bossStats = getBossStats(this.state.worldLevel, config.type)
    this.bossHealth = bossStats.health
    this.bossMaxHealth = bossStats.health
    this.boss = this.physics.add
      .image(WIDTH / 2, 170, config.texture)
      .setDisplaySize(config.displaySize[0], config.displaySize[1])
      .setDepth(3)
      .setData({ boss: true, damage: bossStats.damage })
    const body = this.boss.body as Phaser.Physics.Arcade.Body
    this.setCircularBody(
      body,
      config.type === 'ebola'
        ? HITBOXES.ebolaBoss
        : HITBOXES.coronaBoss,
    )
    body.setImmovable(true)
    this.enemies.add(this.boss)
    this.emitEvent('viral:toast', {
      message: `第 ${this.state.worldLevel} 关 BOSS · ${config.name}`,
    })
    this.emitHud()
  }

  private updateBoss(time: number): void {
    if (!this.boss?.active) return
    this.boss.x = WIDTH / 2 + Math.sin(time * 0.0012) * 115
    if (time < this.bossFiredAt) return

    const bossStats = getBossStats(
      this.state.worldLevel,
      this.bossConfig?.type ?? 'corona',
    )
    const healthRatio = this.bossHealth / this.bossMaxHealth
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
      shot
        .setActive(true)
        .setVisible(true)
        .setDepth(4)
        .setData('damage', bossStats.damage)
      const shotBody = shot.body as Phaser.Physics.Arcade.Body
      shotBody.enable = true
      this.physics.velocityFromAngle(
        startAngle + step * index,
        Math.min(
          bossStats.projectileSpeedMax,
          bossStats.projectileSpeed + (1 - healthRatio) * 25,
        ),
        shotBody.velocity,
      )
    }
    this.bossFiredAt =
      time + Math.max(bossStats.fireEveryMin, 1_180 - (1 - healthRatio) * 530)
    this.emitEvent('viral:sound', { kind: 'boss', quiet: true })
  }

  private finishRun(): void {
    this.transitioning = true
    this.physics.world.pause()
    const stars = getChapterStars(this.state.deaths)
    this.emitHud()
    this.emitEvent('viral:victory', {
      score: this.state.score,
      stars,
      cleaned: this.state.cleaned,
      chapter: getLevelPosition(this.state.worldLevel).chapter,
      completedLevel: this.state.worldLevel,
    })
  }

  private emitHud(): void {
    const level = getLevel(this.state.worldLevel)
    const levelStats = getLevelStats(this.state.worldLevel)
    const detail: HudDetail = {
      health: this.state.health,
      maxHealth: this.state.maxHealth,
      score: this.state.score,
      level: this.state.worldLevel,
      battleLevel: this.state.battleLevel,
      levelName: this.bossActive
        ? (this.bossConfig?.name ?? level.name)
        : level.name,
      progress: this.bossActive
        ? Phaser.Math.Clamp(
            1 - this.bossHealth / this.bossMaxHealth,
            0,
            1,
          )
        : level.mode === 'boss'
          ? 1
          : Phaser.Math.Clamp(
              this.state.cleaned / levelStats.cleanTarget,
              0,
              1,
            ),
      damage: getPlayerCombatStats(this.state).damage,
      boss: this.bossActive,
    }
    this.emitEvent('viral:hud', detail)
  }

  private restorePendingUpgrade(): void {
    const level = getLevel(this.state.worldLevel)
    this.upgradeChoiceSource = 'level'
    this.background.setTint(level.tint)
    this.transitioning = true
    this.physics.world.pause()
    this.emitHud()
    this.emitEvent('viral:levelComplete', {
      level: this.state.worldLevel,
      fact: level.fact,
      bossNext: getLevel(this.state.worldLevel + 1).mode === 'boss',
      options: this.state.pendingUpgrades,
    })
  }

  private emitCheckpoint(): void {
    const detail: RunSave = {
      chapter: getLevelPosition(this.state.worldLevel).chapter,
      worldLevel: this.state.worldLevel,
      health: this.state.health,
      maxHealth: this.state.maxHealth,
      battleLevel: this.state.battleLevel,
      upgrades: { ...this.state.upgrades },
      score: this.state.pendingUpgrades
        ? this.state.score
        : this.state.levelStartScore,
      deaths: this.state.deaths,
      runSeed: this.state.runSeed,
      ...(this.state.pendingUpgrades
        ? { pendingUpgrades: [...this.state.pendingUpgrades] }
        : {}),
    }
    this.emitEvent('viral:checkpoint', detail)
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
          (
            object.x < -120 ||
            object.x > WIDTH + 120 ||
            object.y < -150 ||
            object.y > HEIGHT + 120
          )
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
    this.bossConfig = undefined
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
      const stats = getEnemyStats(this.state.worldLevel, 'basic')
      fragment.setData({
        health: stats.health,
        damage: stats.damage,
        points: Math.round(stats.points * 0.6),
        speed: stats.speed,
        originX: fragment.x,
        wave: 0.004,
        phase: direction > 0 ? 0 : Math.PI,
        amplitude: 30,
      })
      const body = fragment.body as Phaser.Physics.Arcade.Body
      body.enable = true
      this.setCircularBody(body, HITBOXES.splitter)
      body.setVelocityY(stats.speed)
    }
  }

  private spawnSplitAntibodies(
    x: number,
    y: number,
    parentDamage: number,
    hitEnemy: EnemySprite,
  ): void {
    for (const split of getSplitProjectiles(this.state, parentDamage)) {
      const child = this.bullets.get(x, y, 'antibody') as
        | Phaser.Physics.Arcade.Image
        | null
      if (!child) continue

      child
        .setActive(true)
        .setVisible(true)
        .setTexture('antibody')
        .setDepth(4)
        .setScale(0.82)
        .setAngle(split.angle + 90)
        .setAlpha(1)
        .setTint(split.tint)
        .setData({
          damage: split.damage,
          remainingPierces: 0,
          splitChild: true,
          hitTargets: new Set<EnemySprite>([hitEnemy]),
        })
      const body = child.body as Phaser.Physics.Arcade.Body
      body.enable = true
      body.setSize(14, 20)
      this.physics.velocityFromAngle(split.angle, 360, body.velocity)
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
    graphics.fillStyle(0x866eff, 1)
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(16, 0),
        new Phaser.Geom.Point(30, 14),
        new Phaser.Geom.Point(16, 32),
        new Phaser.Geom.Point(2, 14),
      ],
      true,
    )
    graphics.fillStyle(0xe9e4ff, 1)
    graphics.fillTriangle(16, 4, 16, 27, 7, 14)
    graphics.fillStyle(0xffffff, 1)
    graphics.fillCircle(22, 9, 3)
    graphics.generateTexture('skill-fragment', 32, 32)
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
