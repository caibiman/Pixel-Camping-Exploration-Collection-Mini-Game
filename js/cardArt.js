/**
 * 卡面像素美术模块
 * 用 32x32 的 Canvas 手绘每张卡牌的像素图，输出 dataURL 作为 pixel_img_src。
 * 这样无需外部图片资源，同时与数据库字段 pixel_img_src 的使用方式保持一致。
 */
(function () {
  const PC = window.PC;
  const SIZE = 32;
  const cache = {};

  // 像素矩形画笔：所有坐标取整，避免出现抗锯齿
  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // 像素松树：三角树冠 + 树干
  function pine(ctx, cx, baseY, height, color) {
    for (let i = 0; i < height; i++) {
      const half = Math.min(1 + Math.floor(i * 0.55), 6);
      rect(ctx, cx - half, baseY - i, half * 2, 1, color);
    }
    rect(ctx, cx - 1, baseY + 1, 2, 3, '#6b4226');
  }

  const painters = {
    /* ---------- 装备：铜芯提灯 ---------- */
    lantern: function (ctx) {
      rect(ctx, 13, 2, 6, 2, '#4b5563');
      rect(ctx, 12, 4, 1, 3, '#4b5563');
      rect(ctx, 19, 4, 1, 3, '#4b5563');
      rect(ctx, 10, 7, 12, 3, '#374151');
      rect(ctx, 10, 7, 12, 1, '#6b7280');
      rect(ctx, 9, 10, 14, 14, '#374151');
      rect(ctx, 11, 12, 10, 10, '#f59e0b');
      rect(ctx, 12, 13, 8, 8, '#fbbf24');
      rect(ctx, 14, 16, 4, 2, '#fff7cc');
      rect(ctx, 15, 18, 2, 3, '#fff7cc');
      rect(ctx, 13, 12, 1, 10, '#4b5563');
      rect(ctx, 18, 12, 1, 10, '#4b5563');
      rect(ctx, 8, 24, 16, 3, '#4b5563');
      rect(ctx, 8, 24, 16, 1, '#6b7280');
      // 周围的光点
      rect(ctx, 6, 9, 1, 1, '#fde68a');
      rect(ctx, 26, 12, 1, 1, '#fde68a');
      rect(ctx, 5, 21, 1, 1, '#fde68a');
      rect(ctx, 27, 22, 1, 1, '#fde68a');
    },

    /* ---------- 装备：帆布帐篷 ---------- */
    tent: function (ctx) {
      rect(ctx, 3, 26, 26, 2, '#0b1a12');
      for (let row = 0; row < 18; row++) {
        const y = 7 + row;
        const half = Math.round(1 + row * 0.82);
        rect(ctx, 16 - half, y, half * 2, 1, row % 2 ? '#d97706' : '#ca6a1a');
      }
      // 帐篷门
      rect(ctx, 13, 18, 6, 7, '#3b2414');
      rect(ctx, 13, 18, 1, 7, '#5b3a22');
      // 中央撑杆与小旗
      rect(ctx, 15, 4, 2, 10, '#f5e6c8');
      rect(ctx, 17, 4, 5, 3, '#f59e0b');
      rect(ctx, 17, 4, 1, 3, '#b45309');
      // 地钉
      rect(ctx, 4, 27, 2, 1, '#9ca3af');
      rect(ctx, 26, 27, 2, 1, '#9ca3af');
    },

    /* ---------- 装备：搪瓷杯 ---------- */
    mug: function (ctx) {
      rect(ctx, 8, 13, 14, 9, '#dbe4e0');
      rect(ctx, 19, 13, 3, 9, '#b6c2bd');
      rect(ctx, 7, 11, 16, 3, '#c2cec8');
      rect(ctx, 7, 11, 16, 1, '#eef4f1');
      rect(ctx, 9, 13, 12, 1, '#5b3b22');
      // 把手
      rect(ctx, 22, 14, 3, 2, '#c2cec8');
      rect(ctx, 25, 15, 1, 5, '#c2cec8');
      rect(ctx, 22, 19, 3, 2, '#c2cec8');
      // 杯身装饰
      rect(ctx, 8, 20, 14, 1, '#8fa0a0');
      rect(ctx, 13, 16, 2, 2, '#e07a3a');
      // 蒸汽
      rect(ctx, 11, 8, 1, 1, '#9fb8a6');
      rect(ctx, 13, 6, 1, 1, '#9fb8a6');
      rect(ctx, 16, 5, 1, 1, '#9fb8a6');
      rect(ctx, 18, 7, 1, 1, '#9fb8a6');
    },

    /* ---------- 装备：林间手斧 ---------- */
    axe: function (ctx) {
      const steps = [[7, 25], [10, 22], [13, 19], [16, 16], [19, 13]];
      steps.forEach(function (p) {
        rect(ctx, p[0], p[1], 4, 4, '#8b5a2b');
        rect(ctx, p[0], p[1], 4, 1, '#a9713a');
      });
      // 缠绕的握把
      rect(ctx, 10, 22, 4, 1, '#3b2414');
      rect(ctx, 16, 16, 4, 1, '#3b2414');
      // 斧头
      rect(ctx, 19, 8, 8, 4, '#9ca3af');
      rect(ctx, 17, 10, 10, 5, '#6b7280');
      rect(ctx, 19, 8, 1, 7, '#e5e7eb');
      rect(ctx, 26, 8, 1, 7, '#e5e7eb');
      rect(ctx, 17, 14, 10, 1, '#4b5563');
    },

    /* ---------- 装备：星尘水壶 ---------- */
    star_kettle: function (ctx) {
      rect(ctx, 11, 16, 12, 10, '#1e3a5f');
      rect(ctx, 12, 17, 10, 1, '#3b6ea5');
      rect(ctx, 13, 13, 8, 3, '#2b4a6f');
      rect(ctx, 16, 11, 2, 2, '#ffc75a');
      // 壶嘴
      rect(ctx, 23, 17, 4, 2, '#2b4a6f');
      rect(ctx, 26, 15, 2, 2, '#2b4a6f');
      // 提手
      rect(ctx, 14, 9, 6, 1, '#ffc75a');
      rect(ctx, 13, 10, 1, 3, '#ffc75a');
      rect(ctx, 19, 10, 1, 3, '#ffc75a');
      // 壶身星点
      rect(ctx, 13, 19, 1, 1, '#e5ecff');
      rect(ctx, 17, 21, 2, 1, '#e5ecff');
      rect(ctx, 20, 18, 1, 1, '#e5ecff');
      rect(ctx, 15, 23, 1, 1, '#ffc75a');
      rect(ctx, 19, 24, 2, 1, '#ffc75a');
      rect(ctx, 12, 25, 10, 2, '#0f2136');
      // 光晕
      rect(ctx, 8, 15, 1, 1, '#ffc75a');
      rect(ctx, 27, 23, 1, 1, '#ffc75a');
      rect(ctx, 24, 8, 1, 1, '#fff7cc');
    },

    /* ---------- 风景：晨雾松林 ---------- */
    pine_mist: function (ctx) {
      rect(ctx, 0, 0, 32, 32, '#16301f');
      rect(ctx, 0, 0, 32, 9, '#1c3a28');
      // 雾气
      ctx.globalAlpha = 0.22;
      rect(ctx, 0, 18, 32, 5, '#d6e3d2');
      rect(ctx, 0, 24, 32, 3, '#c2d6c0');
      ctx.globalAlpha = 1;
      pine(ctx, 8, 26, 13, '#2c6338');
      pine(ctx, 19, 28, 17, '#1f4a2b');
      pine(ctx, 27, 24, 10, '#3d7f46');
      pine(ctx, 5, 22, 8, '#245430');
      rect(ctx, 25, 4, 2, 2, '#e5f0dd');
    },

    /* ---------- 风景：落日山脊 ---------- */
    sunset_ridge: function (ctx) {
      rect(ctx, 0, 0, 32, 10, '#2b1b3a');
      rect(ctx, 0, 10, 32, 6, '#5a2e46');
      rect(ctx, 0, 16, 32, 5, '#9a4a3f');
      rect(ctx, 0, 21, 32, 6, '#d0763f');
      // 像素太阳
      const sunRows = [3, 5, 7, 7, 6, 4, 2];
      sunRows.forEach(function (w, i) {
        rect(ctx, 21 - Math.floor(w / 2), 14 + i, w, 1, i > 1 ? '#ffd27f' : '#ffe7b0');
      });
      // 山脊剪影
      for (let i = 0; i < 32; i++) {
        const h = 6 + Math.round(Math.sin(i * 0.45) * 2.2 + (i % 5 === 0 ? 2 : 0));
        rect(ctx, i, 32 - h, 1, h, '#1a1220');
        rect(ctx, i, 32 - h, 1, 1, '#54263a');
      }
      // 归鸟
      rect(ctx, 6, 8, 2, 1, '#2b1b3a');
      rect(ctx, 10, 6, 2, 1, '#2b1b3a');
    },

    /* ---------- 风景：镜湖倒影 ---------- */
    mirror_lake: function (ctx) {
      rect(ctx, 0, 0, 32, 20, '#10243f');
      // 星星
      [[5, 3], [9, 6], [14, 2], [25, 4], [29, 8], [7, 11]].forEach(function (p) {
        rect(ctx, p[0], p[1], 1, 1, '#cfe3ff');
      });
      // 方块月亮
      rect(ctx, 23, 2, 3, 2, '#dbeafe');
      rect(ctx, 22, 4, 5, 3, '#dbeafe');
      rect(ctx, 23, 7, 3, 1, '#dbeafe');
      // 远山
      for (let i = 0; i < 32; i++) {
        const h = 5 + Math.round(Math.sin(i * 0.35 + 1) * 2);
        rect(ctx, i, 20 - h, 1, h, '#1b2b44');
      }
      // 湖面
      rect(ctx, 0, 20, 32, 12, '#173a52');
      rect(ctx, 22, 21, 6, 1, '#8fb8d6');
      rect(ctx, 21, 23, 8, 1, '#6f9bbd');
      rect(ctx, 23, 25, 4, 1, '#8fb8d6');
      rect(ctx, 20, 27, 10, 1, '#4f7a99');
      rect(ctx, 4, 23, 6, 1, '#2a5f7d');
      rect(ctx, 12, 27, 7, 1, '#2a5f7d');
      rect(ctx, 2, 29, 5, 1, '#2a5f7d');
    },

    /* ---------- 风景：银河营地 ---------- */
    milky_way: function (ctx) {
      rect(ctx, 0, 0, 32, 32, '#080d24');
      // 银河光带
      for (let i = 0; i < 36; i++) {
        const t = i / 35;
        const bx = 2 + t * 29;
        const by = 30 - t * 27;
        const jitter = Math.round(Math.sin(i * 2.7) * 3);
        rect(ctx, Math.round(bx) + jitter, Math.round(by), 2, 1,
          ['#2b3868', '#46569b', '#6b7bbf'][i % 3]);
      }
      // 亮星
      [[4, 7], [8, 20], [13, 9], [17, 24], [22, 5], [26, 15], [30, 22], [11, 28], [19, 13], [6, 14]]
        .forEach(function (p, i) {
          rect(ctx, p[0], p[1], i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1, '#e5ecff');
        });
      // 前景营地剪影
      rect(ctx, 0, 27, 32, 5, '#050a08');
      for (let i = 0; i < 9; i++) {
        const h = 3 + (i % 3 === 0 ? 2 : 0);
        rect(ctx, 3 + i * 3, 27 - h, 1, h, '#050a08');
      }
      for (let row = 0; row < 5; row++) {
        rect(ctx, 16 - row, 22 + row, row * 2 + 1, 1, '#0a1410');
      }
      rect(ctx, 22, 26, 2, 1, '#f59e0b');
    },

    /* ---------- 小动物：篝火松鼠 ---------- */
    squirrel: function (ctx) {
      const tail = [[18, 21], [20, 19], [22, 17], [23, 14], [22, 11], [20, 9], [17, 8], [14, 9], [12, 11]];
      tail.forEach(function (p, i) {
        rect(ctx, p[0], p[1], 4, 3, i % 2 ? '#b45309' : '#d97706');
      });
      rect(ctx, 20, 12, 2, 4, '#f59e0b');
      rect(ctx, 18, 9, 2, 2, '#fbbf24');
      // 身体
      rect(ctx, 9, 18, 8, 7, '#b45309');
      rect(ctx, 10, 20, 5, 4, '#f5d7a1');
      // 头
      rect(ctx, 8, 13, 7, 6, '#c2661f');
      rect(ctx, 8, 11, 2, 2, '#8b4513');
      rect(ctx, 12, 11, 2, 2, '#8b4513');
      rect(ctx, 9, 15, 1, 1, '#0a0a0a');
      rect(ctx, 8, 17, 1, 1, '#3b2414');
      // 前爪与影子
      rect(ctx, 12, 22, 2, 3, '#8b4513');
      rect(ctx, 8, 26, 14, 1, '#0b1a12');
    },

    /* ---------- 小动物：夜行狐狸 ---------- */
    fox: function (ctx) {
      // 尾巴
      rect(ctx, 18, 21, 6, 4, '#c2661f');
      rect(ctx, 22, 19, 4, 4, '#d97706');
      rect(ctx, 25, 21, 3, 2, '#f8fafc');
      // 身体
      rect(ctx, 12, 17, 7, 8, '#d97706');
      rect(ctx, 14, 18, 3, 5, '#f8fafc');
      // 头
      rect(ctx, 10, 11, 8, 7, '#d97706');
      rect(ctx, 10, 8, 2, 3, '#b45309');
      rect(ctx, 16, 8, 2, 3, '#b45309');
      rect(ctx, 8, 15, 3, 3, '#f8fafc');
      rect(ctx, 8, 16, 1, 1, '#1a1a1a');
      rect(ctx, 12, 13, 1, 1, '#1a1a1a');
      rect(ctx, 15, 13, 1, 1, '#1a1a1a');
      // 腿
      rect(ctx, 12, 24, 2, 3, '#8b4513');
      rect(ctx, 16, 24, 2, 3, '#8b4513');
      rect(ctx, 11, 27, 12, 1, '#0b1a12');
    },

    /* ---------- 小动物：月光白鹿 ---------- */
    moon_deer: function (ctx) {
      // 月光光斑
      rect(ctx, 4, 4, 2, 2, '#2b4a6f');
      rect(ctx, 27, 9, 2, 2, '#2b4a6f');
      rect(ctx, 8, 26, 2, 2, '#2b4a6f');
      // 腿
      [[13, 22], [17, 22], [21, 23], [24, 23]].forEach(function (p) {
        rect(ctx, p[0], p[1], 2, 5, '#9fc4da');
      });
      // 身体
      rect(ctx, 10, 15, 13, 8, '#cfe3f2');
      rect(ctx, 10, 20, 13, 2, '#a9c7dc');
      // 脖子与头
      rect(ctx, 20, 10, 4, 7, '#cfe3f2');
      rect(ctx, 22, 8, 5, 4, '#dcecf7');
      rect(ctx, 23, 5, 2, 3, '#a9c7dc');
      rect(ctx, 25, 9, 1, 1, '#28405a');
      // 鹿角
      rect(ctx, 24, 2, 1, 4, '#e8f4ff');
      rect(ctx, 22, 1, 1, 3, '#e8f4ff');
      rect(ctx, 26, 1, 1, 2, '#e8f4ff');
      rect(ctx, 21, 1, 1, 1, '#e8f4ff');
      rect(ctx, 23, 0, 1, 1, '#e8f4ff');
      // 尾与蹄印微光
      rect(ctx, 9, 17, 2, 3, '#e8f4ff');
      rect(ctx, 11, 27, 1, 1, '#cfe3f2');
      rect(ctx, 18, 28, 1, 1, '#cfe3f2');
      rect(ctx, 26, 27, 1, 1, '#cfe3f2');
    }
  };

  PC.CardArt = {
    /** 生成指定卡牌的像素图 dataURL（带缓存） */
    toDataURL: function (key) {
      if (cache[key]) return cache[key];

      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 统一底色：林地夜空 + 地面，让卡面风格统一
      rect(ctx, 0, 0, SIZE, SIZE, '#0f1e2b');
      rect(ctx, 0, 25, SIZE, 7, '#16301f');

      const painter = painters[key] || painters.lantern;
      painter(ctx);

      const url = canvas.toDataURL('image/png');
      cache[key] = url;
      return url;
    }
  };
})();
