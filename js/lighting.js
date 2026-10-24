/**
 * 昼夜光照模块
 * 白天 → 黄昏 → 夜晚 → 黎明 的循环：
 *  - 全屏叠加色随进度插值（白天明亮 / 黄昏暖橙 / 夜晚深蓝 / 黎明灰紫）
 *  - 夜晚渲染像素星空、月亮与萤火虫
 *  - 篝火永远带有暖光光晕、跳动火苗与上升的余烬粒子
 */
(function () {
  const PC = window.PC;
  const C = PC.CONFIG;
  const VIEW_W = C.VIEW_W;
  const VIEW_H = C.VIEW_H;

  function lerp(a, b, k) {
    return a + (b - a) * k;
  }

  /** 在关键帧数组中采样，返回插值结果 */
  function sampleKeyframes(frames, t, valueKey) {
    let i = 0;
    while (i < frames.length - 2 && t > frames[i + 1].t) i++;
    const a = frames[i];
    const b = frames[i + 1];
    const span = b.t - a.t;
    const k = span <= 0 ? 0 : (t - a.t) / span;

    if (valueKey === 'rgb') {
      return {
        rgb: [
          lerp(a.rgb[0], b.rgb[0], k),
          lerp(a.rgb[1], b.rgb[1], k),
          lerp(a.rgb[2], b.rgb[2], k)
        ],
        alpha: lerp(a.alpha, b.alpha, k)
      };
    }
    return lerp(a.v, b.v, k);
  }

  const Lighting = {
    time: 0, // 0~1 的一天进度
    world: null,
    stars: [],
    fireflies: [],
    embers: [],
    vignette: null,

    init: function (world) {
      this.world = world;
      this.time = 0.08; // 从上午开始

      // 屏幕空间的像素星星
      this.stars = [];
      for (let i = 0; i < 110; i++) {
        this.stars.push({
          x: Math.floor(Math.random() * VIEW_W),
          y: Math.floor(Math.random() * VIEW_H * 0.92),
          size: Math.random() < 0.18 ? 2 : 1,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 2
        });
      }

      // 夜晚萤火虫：分布在可达草地
      this.fireflies = [];
      for (let i = 0; i < 24; i++) {
        const tile = world.randomReachableTile();
        if (!tile) continue;
        this.fireflies.push({
          x: (tile.tx + 0.5) * C.TILE,
          y: (tile.ty + 0.5) * C.TILE,
          phase: Math.random() * Math.PI * 2,
          speed: 0.8 + Math.random() * 1.6
        });
      }

      this.embers = [];
      this.buildVignette();
    },

    buildVignette: function () {
      const canvas = document.createElement('canvas');
      canvas.width = VIEW_W;
      canvas.height = VIEW_H;
      const ctx = canvas.getContext('2d');
      const grd = ctx.createRadialGradient(
        VIEW_W / 2, VIEW_H / 2, 90,
        VIEW_W / 2, VIEW_H / 2, 320
      );
      grd.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grd.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      this.vignette = canvas;
    },

    /** 推进时间，返回是否跨过了一整天 */
    advance: function (dt) {
      this.time += dt / C.DAY_CYCLE_SECONDS;
      let wrapped = false;
      if (this.time >= 1) {
        this.time -= 1;
        wrapped = true;
      }
      return wrapped;
    },

    /** 当前叠加色、夜晚强度与阶段名 */
    sample: function () {
      const day = sampleKeyframes(C.DAY_KEYFRAMES, this.time, 'rgb');
      const night = sampleKeyframes(C.NIGHT_KEYFRAMES, this.time, 'v');
      return {
        rgb: day.rgb,
        alpha: day.alpha,
        night: night,
        phase: this.phaseName(this.time)
      };
    },

    phaseName: function (t) {
      if (t < 0.42) return '白天';
      if (t < 0.56) return '黄昏';
      if (t < 0.9) return '夜晚';
      return '黎明';
    },

    /** 更新余烬粒子 */
    update: function (dt, elapsed) {
      const sample = this.sample();
      const fires = this.world ? this.world.campfires : [];

      fires.forEach(function (fire, index) {
        const p = PC.World.firePixels(fire);
        const count = dt * (4 + sample.night * 20);
        let n = Math.floor(count);
        if (Math.random() < count - n) n += 1;
        for (let i = 0; i < n; i++) {
          this.embers.push({
            x: p.x + (Math.random() - 0.5) * 8,
            y: p.y - 2,
            vx: (Math.random() - 0.5) * 8,
            vy: -(8 + Math.random() * 16),
            life: 0.7 + Math.random() * 0.9,
            maxLife: 1.6,
            seed: index
          });
        }
      }, this);

      for (let i = this.embers.length - 1; i >= 0; i--) {
        const e = this.embers[i];
        e.life -= dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vy += 4 * dt;
        if (e.life <= 0) this.embers.splice(i, 1);
      }
    },

    /** 绘制光照层（在世界与玩家之后调用） */
    draw: function (ctx, cam, elapsed) {
      const sample = this.sample();
      const night = sample.night;
      const viewW = VIEW_W;
      const viewH = VIEW_H;

      // 1) 昼夜叠加
      if (sample.alpha > 0.002) {
        ctx.fillStyle = 'rgba(' +
          Math.round(sample.rgb[0]) + ',' +
          Math.round(sample.rgb[1]) + ',' +
          Math.round(sample.rgb[2]) + ',' +
          sample.alpha.toFixed(3) + ')';
        ctx.fillRect(0, 0, viewW, viewH);
      }

      // 2) 夜晚星空与月亮
      if (night > 0.02) {
        for (let i = 0; i < this.stars.length; i++) {
          const s = this.stars[i];
          const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * s.speed + s.phase));
          ctx.fillStyle = 'rgba(220, 235, 255,' + (night * twinkle * 0.9).toFixed(3) + ')';
          ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        this.drawMoon(ctx, night);
      }

      // 3) 萤火虫
      if (night > 0.12) {
        for (let i = 0; i < this.fireflies.length; i++) {
          const f = this.fireflies[i];
          const bobX = Math.sin(elapsed * f.speed + f.phase) * 3;
          const bobY = Math.cos(elapsed * f.speed * 0.8 + f.phase) * 2;
          const x = Math.round(f.x - cam.x + bobX);
          const y = Math.round(f.y - cam.y + bobY);
          if (x < -4 || y < -4 || x > viewW + 4 || y > viewH + 4) continue;
          const glow = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * 2.4 + f.phase));
          ctx.fillStyle = 'rgba(200, 255, 160,' + (night * glow * 0.22).toFixed(3) + ')';
          ctx.fillRect(x - 2, y - 2, 5, 5);
          ctx.fillStyle = 'rgba(235, 255, 180,' + (night * glow).toFixed(3) + ')';
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // 4) 篝火：光晕 + 火苗 + 余烬
      const fires = this.world ? this.world.campfires : [];
      for (let i = 0; i < fires.length; i++) {
        this.drawCampfire(ctx, cam, fires[i], elapsed, night, i);
      }

      // 5) 暗角
      if (this.vignette) ctx.drawImage(this.vignette, 0, 0);
    },

    drawMoon: function (ctx, night) {
      const mx = VIEW_W - 58;
      const my = 34;
      ctx.fillStyle = 'rgba(228, 240, 255,' + (0.85 * night).toFixed(3) + ')';
      // 方块拼成的月亮
      ctx.fillRect(mx + 3, my, 5, 3);
      ctx.fillRect(mx + 1, my + 2, 9, 6);
      ctx.fillRect(mx + 2, my + 8, 7, 2);
      // 月面阴影
      ctx.fillStyle = 'rgba(150, 170, 200,' + (0.5 * night).toFixed(3) + ')';
      ctx.fillRect(mx + 5, my + 4, 2, 2);
      ctx.fillRect(mx + 3, my + 7, 1, 1);
    },

    drawCampfire: function (ctx, cam, fire, elapsed, night, index) {
      const p = PC.World.firePixels(fire);
      const sx = p.x - cam.x;
      const sy = p.y - cam.y;
      const seed = fire.tx * 3.1 + fire.ty * 1.7 + index;

      // 暖光光晕（叠加混合，夜间更亮）
      const radius = 52 + Math.sin(elapsed * 5 + seed) * 4 + night * 30;
      const glow = ctx.createRadialGradient(sx, sy - 4, 4, sx, sy - 4, radius);
      glow.addColorStop(0, 'rgba(255, 190, 90,' + (0.30 + night * 0.34).toFixed(3) + ')');
      glow.addColorStop(0.45, 'rgba(255, 120, 40,' + (0.13 + night * 0.20).toFixed(3) + ')');
      glow.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
      ctx.globalCompositeOperation = 'source-over';

      // 跳动的像素火苗
      for (let row = 0; row < 6; row++) {
        const wob = Math.sin(elapsed * 10 + row * 1.9 + seed) * 1.2;
        const half = Math.max(1, 5 - row) + Math.round(wob);
        const y = sy - 2 - row * 2;
        let color;
        if (row < 2) color = '#fff7cc';
        else if (row < 3) color = '#fbbf24';
        else if (row < 5) color = '#f59e0b';
        else color = '#d97706';
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(sx - half), Math.round(y), half * 2, 2);
      }
      ctx.fillStyle = '#fffbe6';
      ctx.fillRect(Math.round(sx - 2), Math.round(sy - 4), 4, 3);

      // 上升的余烬
      for (let i = 0; i < this.embers.length; i++) {
        const e = this.embers[i];
        if (e.seed !== index) continue;
        const x = Math.round(e.x - cam.x);
        const y = Math.round(e.y - cam.y);
        const alpha = Math.max(0, Math.min(1, e.life / 1.2));
        ctx.fillStyle = 'rgba(255, 190, 80,' + alpha.toFixed(3) + ')';
        ctx.fillRect(x, y, 1, 2);
      }
    }
  };

  PC.Lighting = Lighting;
})();
