/**
 * 玩家模块
 * WASD / 方向键控制像素小人移动；逐轴碰撞检测，碰到树木、岩石、篝火无法穿行。
 * 角色美术由矩形拼成，带四方向朝向与两帧走路动画。
 */
(function () {
  const PC = window.PC;
  const C = PC.CONFIG;
  const TILE = C.TILE;

  const r = function (ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  /* 正面小人 */
  function drawDown(ctx, px, py, frame) {
    r(ctx, px + 4, py, 8, 3, '#2b1d12');
    r(ctx, px + 3, py + 2, 10, 1, '#2b1d12');
    r(ctx, px + 5, py + 3, 6, 4, '#e6b98d');
    r(ctx, px + 6, py + 5, 1, 1, '#1c1c1c');
    r(ctx, px + 9, py + 5, 1, 1, '#1c1c1c');
    // 外套
    r(ctx, px + 4, py + 7, 8, 6, '#d97706');
    r(ctx, px + 4, py + 7, 2, 6, '#b45309');
    r(ctx, px + 7, py + 7, 2, 1, '#f3e9c9');
    // 手臂
    r(ctx, px + 3, py + 8, 1, 4, '#b45309');
    r(ctx, px + 12, py + 8, 1, 4, '#b45309');
    r(ctx, px + 3, py + 12, 1, 1, '#e6b98d');
    r(ctx, px + 12, py + 12, 1, 1, '#e6b98d');
    // 腰带 / 裤子
    r(ctx, px + 4, py + 12, 8, 1, '#3b2414');
    r(ctx, px + 5, py + 13, 2, 3, '#2b3a55');
    r(ctx, px + 9, py + 13, 2, 3, '#2b3a55');
    // 走路时两脚交替
    const off = frame ? 1 : 0;
    r(ctx, px + 4 + off, py + 16, 3, 2, '#21201c');
    r(ctx, px + 9 - off, py + 16, 3, 2, '#21201c');
  }

  /* 背面小人（可见背包） */
  function drawUp(ctx, px, py, frame) {
    r(ctx, px + 3, py, 10, 4, '#2b1d12');
    r(ctx, px + 4, py + 4, 8, 1, '#3a2a1a');
    r(ctx, px + 3, py + 5, 10, 2, '#d97706');
    // 背包
    r(ctx, px + 3, py + 7, 10, 7, '#6b4226');
    r(ctx, px + 4, py + 8, 8, 2, '#8b5a2b');
    r(ctx, px + 3, py + 7, 1, 7, '#3b2414');
    r(ctx, px + 12, py + 7, 1, 7, '#3b2414');
    r(ctx, px + 6, py + 9, 4, 1, '#3b2414');
    // 手臂
    r(ctx, px + 2, py + 8, 1, 5, '#b45309');
    r(ctx, px + 13, py + 8, 1, 5, '#b45309');
    // 裤子与脚
    r(ctx, px + 5, py + 14, 2, 2, '#2b3a55');
    r(ctx, px + 9, py + 14, 2, 2, '#2b3a55');
    const off = frame ? 1 : 0;
    r(ctx, px + 4 + off, py + 16, 3, 2, '#21201c');
    r(ctx, px + 9 - off, py + 16, 3, 2, '#21201c');
  }

  /* 侧面小人（默认朝右，朝左时水平翻转） */
  function drawSide(ctx, px, py, frame, flipLeft) {
    ctx.save();
    ctx.translate(px, py);
    if (flipLeft) {
      ctx.translate(16, 0);
      ctx.scale(-1, 1);
    }
    r(ctx, 4, 0, 7, 3, '#2b1d12');
    r(ctx, 3, 2, 9, 1, '#2b1d12');
    r(ctx, 5, 3, 6, 4, '#e6b98d');
    r(ctx, 10, 4, 2, 2, '#e6b98d');
    r(ctx, 9, 5, 1, 1, '#1c1c1c');
    // 身体
    r(ctx, 4, 7, 8, 6, '#d97706');
    r(ctx, 4, 7, 2, 6, '#b45309');
    r(ctx, 7, 8, 2, 5, '#6b4226');
    r(ctx, 11, 8, 1, 4, '#b45309');
    r(ctx, 11, 12, 1, 1, '#e6b98d');
    // 腿
    r(ctx, 4, 12, 8, 1, '#3b2414');
    const off = frame ? 1 : 0;
    r(ctx, 5, 13, 3, 3, '#2b3a55');
    r(ctx, 9, 13, 2, 3, '#2b3a55');
    r(ctx, 4 + off, 16, 4, 2, '#21201c');
    r(ctx, 9 - off, 16, 3, 2, '#21201c');
    ctx.restore();
  }

  const Player = {
    x: 0,
    y: 0,
    dir: 'down',
    moving: false,
    walkPhase: 0,

    init: function (x, y) {
      this.x = x;
      this.y = y;
      this.dir = 'down';
      this.moving = false;
      this.walkPhase = 0;
    },

    /**
     * 更新玩家位置
     * @param {number} dt 秒
     * @param {object} keys 按键状态
     * @param {object} world 地图模块
     */
    update: function (dt, keys, world) {
      let vx = 0;
      let vy = 0;
      if (keys.left) vx -= 1;
      if (keys.right) vx += 1;
      if (keys.up) vy -= 1;
      if (keys.down) vy += 1;

      this.moving = !!(vx || vy);

      if (this.moving) {
        // 对角线速度归一化
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;

        // 朝向优先取垂直方向，手感更自然
        if (vy < 0) this.dir = 'up';
        else if (vy > 0) this.dir = 'down';
        else if (vx < 0) this.dir = 'left';
        else if (vx > 0) this.dir = 'right';

        const speed = C.PLAYER_SPEED;
        const hb = C.PLAYER_HITBOX;

        // 逐轴移动 + 碰撞，避免卡在障碍物拐角
        const nx = this.x + vx * speed * dt;
        if (world.isWalkableRect(nx, this.y, hb.w, hb.h)) this.x = nx;

        const ny = this.y + vy * speed * dt;
        if (world.isWalkableRect(this.x, ny, hb.w, hb.h)) this.y = ny;

        this.walkPhase += dt * 9;
      } else {
        this.walkPhase = 0;
      }
    },

    draw: function (ctx, cam) {
      const px = Math.round(this.x - cam.x) - 8;
      const py = Math.round(this.y - cam.y) - 18;
      const frame = this.moving ? Math.floor(this.walkPhase) % 2 : 0;

      // 脚下影子
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(px + 4, py + 17, 8, 2);

      if (this.dir === 'down') drawDown(ctx, px, py, frame);
      else if (this.dir === 'up') drawUp(ctx, px, py, frame);
      else drawSide(ctx, px, py, frame, this.dir === 'left');
    }
  };

  PC.Player = Player;
})();
