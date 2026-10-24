/**
 * 拾取与抽卡触发模块
 * 地图上随机刷新柴禾 / 水壶，玩家走近自动拾取并触发抽卡（由 main 中的回调处理）。
 */
(function () {
  const PC = window.PC;
  const C = PC.CONFIG;

  const Loot = {
    items: [],
    timer: 0,

    /** 重置并预生成若干道具 */
    reset: function (world, player) {
      this.items = [];
      this.timer = 0;
      for (let i = 0; i < 3; i++) this.spawnOne(world, player);
    },

    /** 在随机可达瓦片上生成一个道具 */
    spawnOne: function (world, player) {
      if (this.items.length >= C.MAX_ITEMS) return null;

      for (let attempt = 0; attempt < 24; attempt++) {
        const tile = world.randomReachableTile();
        if (!tile) return null;

        const x = (tile.tx + 0.5) * C.TILE;
        const y = (tile.ty + 0.5) * C.TILE;

        // 不要离火太近（视觉上会被火光盖住），也不要直接刷在玩家脚下
        if (world.nearestFireDistance(x, y) < 26) continue;
        if (player && Math.hypot(x - player.x, y - player.y) < 34) continue;

        const item = {
          kind: Math.random() < 0.5 ? 'firewood' : 'kettle',
          x: x,
          y: y,
          phase: Math.random() * Math.PI * 2
        };
        this.items.push(item);
        return item;
      }
      return null;
    },

    /**
     * 更新道具：定时补充新道具、检测玩家拾取
     * @param {number} dt
     * @param {object} world
     * @param {object} player
     * @param {function} onPickup 拾取回调
     */
    update: function (dt, world, player, onPickup) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = C.ITEM_SPAWN_INTERVAL * (0.7 + Math.random() * 0.7);
        if (this.items.length < C.MAX_ITEMS) this.spawnOne(world, player);
      }

      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        const dist = Math.hypot(item.x - player.x, item.y - 2 - player.y);
        if (dist <= C.PICKUP_RADIUS) {
          this.items.splice(i, 1);
          if (onPickup) onPickup(item);
        }
      }
    },

    /** 绘制道具（带轻微上下浮动） */
    draw: function (ctx, cam, elapsed) {
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        const bob = Math.round(Math.sin(elapsed * 3 + item.phase) * 1.5);
        const x = Math.round(item.x - cam.x);
        const y = Math.round(item.y - cam.y) + bob;

        // 地面影子
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(x - 5, y + 3, 10, 2);

        if (item.kind === 'firewood') this.drawFirewood(ctx, x, y);
        else this.drawKettle(ctx, x, y);

        // 闪烁提示：每隔一段时间亮起一颗小星点
        const sparkle = Math.sin(elapsed * 2 + item.phase * 3);
        if (sparkle > 0.75) {
          ctx.fillStyle = '#fff7cc';
          ctx.fillRect(x + 6, y - 8, 1, 1);
          ctx.fillRect(x + 5, y - 9, 1, 1);
        }
      }
    },

    drawFirewood: function (ctx, x, y) {
      // 交叉的柴禾
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(x - 6, y - 4, 11, 3);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(x - 6, y - 4, 11, 1);
      ctx.fillStyle = '#4a2c18';
      ctx.fillRect(x - 4, y - 1, 10, 3);
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(x - 4, y - 1, 10, 1);
      // 断面
      ctx.fillStyle = '#c98b4b';
      ctx.fillRect(x + 5, y - 4, 1, 3);
      ctx.fillRect(x + 6, y - 1, 1, 3);
      // 捆绳
      ctx.fillStyle = '#3b2414';
      ctx.fillRect(x - 1, y - 5, 2, 7);
    },

    drawKettle: function (ctx, x, y) {
      // 壶身
      ctx.fillStyle = '#2b4a6f';
      ctx.fillRect(x - 5, y - 3, 10, 6);
      ctx.fillStyle = '#3b6ea5';
      ctx.fillRect(x - 4, y - 3, 8, 1);
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(x - 5, y + 2, 10, 1);
      // 壶盖与提手
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(x - 3, y - 5, 6, 2);
      ctx.fillStyle = '#ffc75a';
      ctx.fillRect(x - 1, y - 7, 2, 2);
      // 壶嘴
      ctx.fillStyle = '#2b4a6f';
      ctx.fillRect(x + 5, y - 1, 2, 1);
      ctx.fillRect(x + 6, y - 2, 1, 1);
    }
  };

  PC.Loot = Loot;
})();
