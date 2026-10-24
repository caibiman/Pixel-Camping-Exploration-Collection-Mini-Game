/**
 * 主控模块
 * 负责：启动流程、输入处理、游戏主循环、相机跟随、拾取抽卡联动、HUD 刷新、画布缩放
 */
(function () {
  const PC = window.PC;
  const C = PC.CONFIG;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const keys = { up: false, down: false, left: false, right: false };
  const cam = { x: 0, y: 0 };

  let day = 1;
  let elapsed = 0;
  let lastTs = 0;
  let hudTimer = 0;
  let audioUnlocked = false;

  /* ---------------- 相机 ---------------- */
  function cameraTarget() {
    const maxX = PC.World.W * C.TILE - C.VIEW_W;
    const maxY = PC.World.H * C.TILE - C.VIEW_H;
    return {
      x: Math.max(0, Math.min(maxX, PC.Player.x - C.VIEW_W / 2)),
      y: Math.max(0, Math.min(maxY, PC.Player.y - C.VIEW_H / 2))
    };
  }

  function snapCamera() {
    const t = cameraTarget();
    cam.x = t.x;
    cam.y = t.y;
  }

  function updateCamera(dt) {
    const t = cameraTarget();
    const k = 1 - Math.exp(-8 * dt);
    cam.x += (t.x - cam.x) * k;
    cam.y += (t.y - cam.y) * k;
  }

  /* ---------------- 音效 ---------------- */
  function unlockAudio() {
    if (audioUnlocked) return;
    PC.Audio.ensure();
    audioUnlocked = true;
  }

  function toggleSound() {
    unlockAudio();
    const on = PC.Audio.toggle();
    PC.UI.setStats({ soundOn: on });
    if (on) PC.Audio.tone(880, 0, 0.08, 'square', 0.08);
  }

  /* ---------------- 拾取 → 抽卡 ---------------- */
  function handlePickup() {
    PC.Audio.pickup();

    const card = PC.CardRepo.drawRandomCard();
    if (!card) return;

    const isNew = PC.CardRepo.markCollected(card.id);
    PC.UI.showReveal(card, isNew);
    PC.UI.setStats({
      collected: PC.CardRepo.getCollectedCount(),
      total: PC.CardRepo.getTotal()
    });

    // 翻牌到一半时播放抽卡音效，更有仪式感
    window.setTimeout(function () {
      PC.Audio.reveal(card.rarity);
    }, 520);
  }

  /* ---------------- 输入 ---------------- */
  function bindInput() {
    window.addEventListener('keydown', function (e) {
      unlockAudio();
      const k = e.key.toLowerCase();

      if (k === 'w' || k === 'arrowup') { keys.up = true; e.preventDefault(); }
      else if (k === 's' || k === 'arrowdown') { keys.down = true; e.preventDefault(); }
      else if (k === 'a' || k === 'arrowleft') { keys.left = true; e.preventDefault(); }
      else if (k === 'd' || k === 'arrowright') { keys.right = true; e.preventDefault(); }
      else if (k === 'b') {
        e.preventDefault();
        if (PC.UI.isBackpackOpen()) PC.UI.closeBackpack();
        else if (!PC.UI.isRevealOpen()) PC.UI.openBackpack();
      } else if (k === 'escape') {
        if (PC.UI.isDetailOpen()) PC.UI.closeDetail();
        else if (PC.UI.isBackpackOpen()) PC.UI.closeBackpack();
        else if (PC.UI.isRevealOpen()) PC.UI.closeReveal();
      } else if (k === 'm') {
        toggleSound();
      } else if ((k === ' ' || k === 'enter') && PC.UI.isRevealOpen()) {
        e.preventDefault();
        PC.UI.closeReveal();
      }
    });

    window.addEventListener('keyup', function (e) {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.up = false;
      else if (k === 's' || k === 'arrowdown') keys.down = false;
      else if (k === 'a' || k === 'arrowleft') keys.left = false;
      else if (k === 'd' || k === 'arrowright') keys.right = false;
    });

    // 焦点丢失时清空按键，避免角色一直移动
    window.addEventListener('blur', function () {
      keys.up = keys.down = keys.left = keys.right = false;
    });

    window.addEventListener('pointerdown', unlockAudio);
  }

  /* ---------------- 画布缩放 ---------------- */
  function resize() {
    // 页面只保留紧凑标题与页脚，让游戏画面尽量铺满视口
    const availW = window.innerWidth - 28;
    const availH = window.innerHeight - 108;

    // 使用分数倍缩放：image-rendering: pixelated 会保持像素硬边
    const fit = Math.min(availW / C.VIEW_W, availH / C.VIEW_H);
    const scale = Math.max(0.55, Math.min(fit, 5));

    canvas.style.width = Math.floor(C.VIEW_W * scale) + 'px';
    canvas.style.height = Math.floor(C.VIEW_H * scale) + 'px';
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    ctx.fillStyle = '#0b1430';
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);

    PC.World.draw(ctx, cam);
    PC.Loot.draw(ctx, cam, elapsed);
    PC.Player.draw(ctx, cam);
    PC.Lighting.draw(ctx, cam, elapsed);
  }

  /* ---------------- HUD ---------------- */
  function updateHud(dt) {
    hudTimer -= dt;
    if (hudTimer > 0) return;
    hudTimer = 0.2;

    const sample = PC.Lighting.sample();
    PC.UI.setStats({
      phase: sample.phase,
      day: day,
      collected: PC.CardRepo.getCollectedCount(),
      total: PC.CardRepo.getTotal(),
      soundOn: PC.Audio.enabled
    });
  }

  /* ---------------- 主循环 ---------------- */
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    elapsed += dt;

    if (!PC.UI.isBlocking()) {
      if (PC.Lighting.advance(dt)) day += 1;
      PC.Player.update(dt, keys, PC.World);
      PC.Loot.update(dt, PC.World, PC.Player, handlePickup);
      PC.Lighting.update(dt, elapsed);

      // 靠近篝火时才播放噼啪声
      const nearFire = PC.World.nearestFireDistance(PC.Player.x, PC.Player.y) < 120;
      PC.Audio.update(dt, nearFire);

      updateCamera(dt);
    }

    render();
    updateHud(dt);
    window.requestAnimationFrame(loop);
  }

  /* ---------------- 启动 ---------------- */
  async function boot() {
    await PC.CardRepo.init();

    PC.World.generate();
    PC.Player.init(PC.World.spawn.x, PC.World.spawn.y);
    PC.Lighting.init(PC.World);
    PC.Loot.reset(PC.World, PC.Player);
    PC.UI.init({ onToggleSound: toggleSound });
    PC.Audio.init();

    snapCamera();
    bindInput();
    resize();
    window.addEventListener('resize', resize);

    PC.UI.setStats({
      phase: PC.Lighting.sample().phase,
      day: day,
      collected: PC.CardRepo.getCollectedCount(),
      total: PC.CardRepo.getTotal(),
      soundOn: PC.Audio.enabled
    });

    window.requestAnimationFrame(loop);
  }

  boot();
})();
