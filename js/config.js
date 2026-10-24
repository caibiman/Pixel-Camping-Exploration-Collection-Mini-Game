/**
 * 全局配置模块
 * 统一管理瓦片尺寸、视口、世界大小、昼夜节奏、稀有度权重等常量。
 */
(function () {
  const PC = (window.PC = window.PC || {});

  PC.CONFIG = {
    // 瓦片与视口（逻辑分辨率固定，CSS 再按整数倍放大，保证像素清晰）
    TILE: 16,
    VIEW_W: 480,
    VIEW_H: 320,
    WORLD_W: 40,
    WORLD_H: 30,

    // 玩家
    PLAYER_SPEED: 82, // 像素 / 秒
    PLAYER_HITBOX: { w: 10, h: 8 }, // 只取脚下区域做碰撞，移动更灵活

    // 昼夜循环：一整天（白天→黄昏→夜晚→黎明）的秒数
    DAY_CYCLE_SECONDS: 120,

    // 拾取道具
    MAX_ITEMS: 6,
    ITEM_SPAWN_INTERVAL: 2.4,
    PICKUP_RADIUS: 13,

    // 本地存储键
    STORAGE_KEY: 'pixel_camp.collected.v1',
    SOUND_KEY: 'pixel_camp.sound.v1',

    // 稀有度：label 展示名、weight 抽卡权重、color 主题色
    RARITY: {
      common: { label: '普通', weight: 62, color: '#a9c0ab' },
      rare: { label: '稀有', weight: 30, color: '#6fb3ff' },
      legendary: { label: '传说', weight: 8, color: '#ffc75a' }
    },

    // 卡牌分类展示名
    CATEGORY_LABEL: {
      gear: '装备',
      scenery: '风景',
      animal: '小动物'
    },

    // 昼夜叠加色关键帧（t: 0~1 的一天进度）
    DAY_KEYFRAMES: [
      { t: 0.0, rgb: [0, 0, 0], alpha: 0.0 },        // 白天
      { t: 0.38, rgb: [0, 0, 0], alpha: 0.0 },
      { t: 0.48, rgb: [122, 58, 20], alpha: 0.3 },    // 黄昏
      { t: 0.56, rgb: [10, 18, 52], alpha: 0.66 },    // 夜晚
      { t: 0.86, rgb: [10, 18, 52], alpha: 0.66 },
      { t: 0.92, rgb: [92, 70, 110], alpha: 0.34 },   // 黎明
      { t: 1.0, rgb: [0, 0, 0], alpha: 0.0 }
    ],

    // 夜晚强度（用于星星、萤火虫、篝火光晕）
    NIGHT_KEYFRAMES: [
      { t: 0.0, v: 0 },
      { t: 0.5, v: 0 },
      { t: 0.56, v: 1 },
      { t: 0.86, v: 1 },
      { t: 0.94, v: 0.3 },
      { t: 1.0, v: 0 }
    ]
  };
})();
