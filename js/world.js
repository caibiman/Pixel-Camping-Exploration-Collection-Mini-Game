/**
 * 地图模块
 * 负责：程序化生成瓦片地图、固定篝火点位、碰撞检测、静态地图预渲染（bake）
 * 瓦片类型：草地 / 花草地 / 树木（障碍）/ 岩石（障碍）/ 篝火（障碍）
 */
(function () {
  const PC = window.PC;
  const C = PC.CONFIG;
  const TILE = C.TILE;

  const T = { GRASS: 0, FLOWER: 1, TREE: 2, ROCK: 3, FIRE: 4 };
  const SOLID = { 2: true, 3: true, 4: true };

  // 稳定哈希：让每块草地的杂点固定，不随帧抖动
  function hash2(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  const World = {
    T: T,
    W: C.WORLD_W,
    H: C.WORLD_H,
    grid: [],          // [y][x] 瓦片类型
    campfires: [],     // 固定篝火点位 [{tx,ty}]
    spawn: { x: 0, y: 0 },
    reachable: [],     // [y][x] 是否从出生点可达
    walkableTiles: [], // 可达且可站立的瓦片列表，供道具/萤火虫刷新
    baked: null,       // 预渲染的整张地图

    inBounds: function (tx, ty) {
      return tx >= 0 && ty >= 0 && tx < this.W && ty < this.H;
    },

    tileAt: function (tx, ty) {
      if (!this.inBounds(tx, ty)) return T.TREE;
      return this.grid[ty][tx];
    },

    isSolid: function (tx, ty) {
      if (!this.inBounds(tx, ty)) return true;
      return !!SOLID[this.grid[ty][tx]];
    },

    /** 像素级碰撞：用脚下矩形检查覆盖到的瓦片 */
    isWalkableRect: function (px, py, w, h) {
      const x0 = Math.floor((px - w / 2) / TILE);
      const x1 = Math.floor((px + w / 2 - 0.01) / TILE);
      const y0 = Math.floor((py - h) / TILE);
      const y1 = Math.floor((py - 0.01) / TILE);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (this.isSolid(tx, ty)) return false;
        }
      }
      return true;
    },

    /** 生成地图 */
    generate: function () {
      const W = this.W;
      const H = this.H;
      const grid = [];

      for (let y = 0; y < H; y++) {
        const row = [];
        for (let x = 0; x < W; x++) {
          row.push(Math.random() < 0.16 ? T.FLOWER : T.GRASS);
        }
        grid.push(row);
      }

      // 世界外围两圈树木，形成天然边界
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) grid[y][x] = T.TREE;
        }
      }

      // 随机树丛
      for (let i = 0; i < 26; i++) {
        const cx = 3 + Math.floor(Math.random() * (W - 6));
        const cy = 3 + Math.floor(Math.random() * (H - 6));
        const r = 1 + Math.floor(Math.random() * 2);
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.random() > 0.68) continue;
            const tx = cx + dx;
            const ty = cy + dy;
            if (tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2) continue;
            grid[ty][tx] = T.TREE;
          }
        }
      }

      // 随机岩石
      for (let i = 0; i < 16; i++) {
        const cx = 3 + Math.floor(Math.random() * (W - 6));
        const cy = 3 + Math.floor(Math.random() * (H - 6));
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (Math.random() > 0.6) continue;
            const tx = cx + dx;
            const ty = cy + dy;
            if (tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2) continue;
            grid[ty][tx] = T.ROCK;
          }
        }
      }

      // 固定篝火点位：中央营地 + 林间小营地
      const fires = [
        { tx: Math.floor(W / 2), ty: Math.floor(H / 2) },
        { tx: Math.floor(W * 0.2), ty: Math.floor(H * 0.72) }
      ];

      fires.forEach(function (f) {
        // 清出 5x5 空地，保证篝火可见且四周可走
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const tx = f.tx + dx;
            const ty = f.ty + dy;
            if (tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2) continue;
            grid[ty][tx] = Math.random() < 0.18 ? T.FLOWER : T.GRASS;
          }
        }
        grid[f.ty][f.tx] = T.FIRE;
      });

      this.grid = grid;

      // 出生点：中央篝火下方两格
      const sx = fires[0].tx;
      const sy = fires[0].ty + 2;
      this.spawn = { x: (sx + 0.5) * TILE, y: (sy + 0.8) * TILE };
      this.campfires = fires;

      // 计算可达区域与可站立瓦片
      this.reachable = this.floodFill(sx, sy);
      this.walkableTiles = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (this.reachable[y][x] && !SOLID[grid[y][x]]) {
            this.walkableTiles.push({ tx: x, ty: y });
          }
        }
      }

      this.bake();
    },

    /** 从出生点做四邻域洪水填充，得到可达区域 */
    floodFill: function (sx, sy) {
      const W = this.W;
      const H = this.H;
      const seen = [];
      for (let y = 0; y < H; y++) seen.push(new Array(W).fill(false));

      if (!this.inBounds(sx, sy)) return seen;
      const stack = [[sx, sy]];
      seen[sy][sx] = true;

      while (stack.length) {
        const cur = stack.pop();
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let i = 0; i < dirs.length; i++) {
          const nx = cur[0] + dirs[i][0];
          const ny = cur[1] + dirs[i][1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (seen[ny][nx]) continue;
          if (SOLID[this.grid[ny][nx]]) continue;
          seen[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
      return seen;
    },

    /** 随机取一个可达、可站立的瓦片 */
    randomReachableTile: function () {
      if (!this.walkableTiles.length) return null;
      return this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)];
    },

    /** 篝火中心的世界像素坐标 */
    firePixels: function (fire) {
      return { x: (fire.tx + 0.5) * TILE, y: (fire.ty + 0.5) * TILE };
    },

    /** 距离最近篝火的像素距离 */
    nearestFireDistance: function (x, y) {
      let best = Infinity;
      for (let i = 0; i < this.campfires.length; i++) {
        const p = this.firePixels(this.campfires[i]);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < best) best = d;
      }
      return best;
    },

    /* ---------------- 静态地图预渲染 ---------------- */
    bake: function () {
      const canvas = document.createElement('canvas');
      canvas.width = this.W * TILE;
      canvas.height = this.H * TILE;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      for (let y = 0; y < this.H; y++) {
        for (let x = 0; x < this.W; x++) {
          const tx = x * TILE;
          const ty = y * TILE;
          const tile = this.grid[y][x];

          this.drawGround(ctx, tx, ty, x, y);
          if (tile === T.FLOWER) this.drawFlowers(ctx, tx, ty, x, y);
          if (tile === T.TREE) this.drawTree(ctx, tx, ty);
          if (tile === T.ROCK) this.drawRock(ctx, tx, ty);
          if (tile === T.FIRE) this.drawFire(ctx, tx, ty);
        }
      }

      this.baked = canvas;
    },

    drawGround: function (ctx, tx, ty, x, y) {
      const base = hash2(x, y) > 0.5 ? '#2e5d34' : '#33673a';
      ctx.fillStyle = base;
      ctx.fillRect(tx, ty, TILE, TILE);

      // 草叶杂点
      for (let i = 0; i < 4; i++) {
        const hx = Math.floor(hash2(x * 3 + i, y * 5 + i) * TILE);
        const hy = Math.floor(hash2(x * 7 + i, y * 11 + i) * TILE);
        ctx.fillStyle = hash2(x + i, y + i) > 0.5 ? '#3d7f46' : '#2a5530';
        ctx.fillRect(tx + hx, ty + hy, 1, 2);
      }
    },

    drawFlowers: function (ctx, tx, ty, x, y) {
      const spots = [
        [3 + Math.floor(hash2(x, y) * 4), 4],
        [10, 9 + Math.floor(hash2(y, x) * 3)]
      ];
      spots.forEach(function (s, i) {
        ctx.fillStyle = i % 2 ? '#e8d98a' : '#dbe9c4';
        ctx.fillRect(tx + s[0], ty + s[1], 2, 1);
        ctx.fillStyle = '#f6e7a0';
        ctx.fillRect(tx + s[0] + 1, ty + s[1] - 1, 1, 1);
      });
    },

    drawTree: function (ctx, tx, ty) {
      // 落影
      ctx.fillStyle = '#1b3f25';
      ctx.fillRect(tx + 3, ty + 12, 11, 3);
      // 树干
      ctx.fillStyle = '#4a2c18';
      ctx.fillRect(tx + 7, ty + 9, 3, 6);
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(tx + 7, ty + 9, 2, 6);
      // 树冠（三层，由暗到亮）
      ctx.fillStyle = '#14351f';
      ctx.fillRect(tx + 1, ty + 3, 14, 9);
      ctx.fillStyle = '#1f4a2b';
      ctx.fillRect(tx + 2, ty + 1, 12, 10);
      ctx.fillStyle = '#2c6338';
      ctx.fillRect(tx + 3, ty + 2, 10, 6);
      ctx.fillStyle = '#3d7f46';
      ctx.fillRect(tx + 4, ty + 3, 4, 2);
      ctx.fillRect(tx + 9, ty + 5, 2, 2);
      // 树冠锯齿边缘
      ctx.fillStyle = '#163b23';
      ctx.fillRect(tx + 4, ty + 11, 3, 2);
      ctx.fillRect(tx + 10, ty + 12, 4, 2);
    },

    drawRock: function (ctx, tx, ty) {
      // 落影
      ctx.fillStyle = '#1b3f25';
      ctx.fillRect(tx + 2, ty + 13, 12, 2);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(tx + 3, ty + 12, 10, 2);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(tx + 2, ty + 8, 12, 5);
      ctx.fillStyle = '#52525b';
      ctx.fillRect(tx + 4, ty + 6, 8, 5);
      ctx.fillStyle = '#71717a';
      ctx.fillRect(tx + 5, ty + 7, 4, 2);
      ctx.fillStyle = '#2f2f35';
      ctx.fillRect(tx + 11, ty + 10, 3, 3);
    },

    drawFire: function (ctx, tx, ty) {
      // 石圈
      const stones = [[1, 9], [4, 6], [9, 6], [13, 9], [13, 13], [1, 13]];
      ctx.fillStyle = '#4b5563';
      stones.forEach(function (s) { ctx.fillRect(tx + s[0], ty + s[1], 3, 3); });
      ctx.fillStyle = '#6b7280';
      stones.forEach(function (s) { ctx.fillRect(tx + s[0], ty + s[1], 3, 1); });
      // 柴堆
      ctx.fillStyle = '#3b2414';
      ctx.fillRect(tx + 4, ty + 11, 9, 3);
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(tx + 5, ty + 10, 7, 2);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(tx + 6, ty + 11, 2, 1);
      // 灰烬
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(tx + 6, ty + 13, 5, 1);
    },

    /** 绘制世界到屏幕（相机偏移） */
    draw: function (ctx, cam) {
      if (!this.baked) return;
      ctx.drawImage(this.baked, -Math.round(cam.x), -Math.round(cam.y));
    }
  };

  PC.World = World;
})();
