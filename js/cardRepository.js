/**
 * 卡牌仓库模块
 * 职责：
 *  1. 读取卡牌元数据（优先尝试后端 PostgreSQL 接口，失败则使用内置数据）
 *  2. 生成/补全 pixel_img_src（像素图 dataURL）
 *  3. 用 localStorage 保存已收集卡牌 ID 列表
 *  4. 提供按稀有度权重抽卡的能力
 */
(function () {
  const PC = window.PC;
  const C = PC.CONFIG;

  const CardRepo = {
    cards: [],
    collected: new Set(),

    /** 初始化：加载卡牌数据与收集进度 */
    init: async function () {
      const remote = await this.fetchFromDatabase();
      const raw = remote && remote.length ? remote : PC.CARD_DATA;

      this.cards = raw.map(function (item) {
        const card = Object.assign({}, item);
        card.id = String(card.id);
        card.rarity = C.RARITY[card.rarity] ? card.rarity : 'common';
        card.category = C.CATEGORY_LABEL[card.category] ? card.category : 'gear';
        // 补全像素图（数据库若已提供 pixel_img_src 则直接使用）
        if (!card.pixel_img_src) {
          card.pixel_img_src = PC.CardArt.toDataURL(card.artKey || card.id);
        }
        return card;
      });

      this.loadCollected();
      return this.cards;
    },

    /**
     * 预留接口：从 PostgreSQL 读取 camp_card 元数据
     * 期望后端（FastAPI / Express 等）提供：
     *   GET /api/camp-cards
     *   SELECT id, card_name, rarity, description, pixel_img_src, category FROM camp_card ORDER BY id;
     * 返回 JSON 数组；字段名与表结构一致。
     * 纯前端/静态部署时该接口不存在，函数返回 null，自动回落到内置数据。
     */
    fetchFromDatabase: async function () {
      try {
        const res = await fetch('/api/camp-cards', { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        return data.map(function (row) {
          return {
            id: String(row.id),
            card_name: row.card_name,
            rarity: row.rarity,
            description: row.description,
            pixel_img_src: row.pixel_img_src || null,
            category: row.category,
            artKey: row.artKey || undefined
          };
        });
      } catch (err) {
        // 无后端或跨域失败：静默回落
        return null;
      }
    },

    /** 从 localStorage 读取已收集 ID */
    loadCollected: function () {
      this.collected = new Set();
      try {
        const raw = window.localStorage.getItem(C.STORAGE_KEY);
        if (!raw) return;
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) {
          const self = this;
          ids.forEach(function (id) { self.collected.add(String(id)); });
        }
      } catch (err) {
        // 存储被禁用或数据损坏时忽略
      }
    },

    /** 写回 localStorage */
    saveCollected: function () {
      try {
        window.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(Array.from(this.collected)));
      } catch (err) {
        // 忽略隐私模式等异常
      }
    },

    isCollected: function (id) {
      return this.collected.has(String(id));
    },

    /** 记录收集，返回是否为“新卡” */
    markCollected: function (id) {
      const key = String(id);
      const isNew = !this.collected.has(key);
      if (isNew) {
        this.collected.add(key);
        this.saveCollected();
      }
      return isNew;
    },

    getCollectedCount: function () {
      return this.collected.size;
    },

    getTotal: function () {
      return this.cards.length;
    },

    getById: function (id) {
      return this.cards.find(function (c) { return c.id === String(id); }) || null;
    },

    /** 按稀有度权重抽一张卡（未收集的优先，避免过早重复） */
    drawRandomCard: function () {
      if (!this.cards.length) return null;

      const self = this;
      const uncollected = this.cards.filter(function (c) { return !self.isCollected(c.id); });
      const pool = uncollected.length ? uncollected : this.cards;

      // 汇总池内各稀有度权重
      const weights = {};
      let total = 0;
      pool.forEach(function (card) {
        const w = (C.RARITY[card.rarity] || C.RARITY.common).weight;
        weights[card.rarity] = (weights[card.rarity] || 0) + w;
        total += w;
      });

      let roll = Math.random() * total;
      let pickedRarity = pool[0].rarity;
      for (const rarity in weights) {
        roll -= weights[rarity];
        if (roll <= 0) {
          pickedRarity = rarity;
          break;
        }
      }

      const candidates = pool.filter(function (c) { return c.rarity === pickedRarity; });
      const list = candidates.length ? candidates : pool;
      return list[Math.floor(Math.random() * list.length)];
    }
  };

  PC.CardRepo = CardRepo;
})();
