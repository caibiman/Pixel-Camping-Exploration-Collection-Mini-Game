/**
 * 图鉴 UI 模块
 * 负责：HUD 数据、背包图鉴网格、抽卡翻牌动画弹窗、卡牌详情弹窗、弹窗互斥控制
 */
(function () {
  const PC = window.PC;
  const C = PC.CONFIG;

  const UI = {
    el: {},
    handlers: {},

    init: function (handlers) {
      this.handlers = handlers || {};

      const $ = function (id) { return document.getElementById(id); };
      this.el = {
        phase: $('hud-phase'),
        day: $('hud-day'),
        collected: $('hud-collected'),
        total: $('hud-total'),
        btnSound: $('btn-sound'),
        btnBackpack: $('btn-backpack'),

        modalReveal: $('modal-reveal'),
        revealHead: $('reveal-head'),
        flipInner: $('flip-inner'),
        flipFront: $('flip-front'),
        revealRarity: $('reveal-rarity'),
        revealImg: $('reveal-img'),
        revealName: $('reveal-name'),
        revealCategory: $('reveal-category'),
        revealDesc: $('reveal-desc'),
        revealNew: $('reveal-new'),
        btnRevealContinue: $('btn-reveal-continue'),

        modalBackpack: $('modal-backpack'),
        bpCount: $('bp-count'),
        bpGrid: $('bp-grid'),
        btnBpClose: $('btn-bp-close'),

        modalDetail: $('modal-detail'),
        detailName: $('detail-name'),
        detailImg: $('detail-img'),
        detailRarity: $('detail-rarity'),
        detailCategory: $('detail-category'),
        detailId: $('detail-id'),
        detailDesc: $('detail-desc'),
        btnDetailClose: $('btn-detail-close')
      };

      const self = this;

      this.el.btnBackpack.addEventListener('click', function () { self.openBackpack(); });
      this.el.btnBpClose.addEventListener('click', function () { self.closeBackpack(); });
      this.el.btnDetailClose.addEventListener('click', function () { self.closeDetail(); });
      this.el.btnRevealContinue.addEventListener('click', function () { self.closeReveal(); });
      this.el.btnSound.addEventListener('click', function () {
        if (self.handlers.onToggleSound) self.handlers.onToggleSound();
      });

      // 点击图鉴中的卡牌 → 详情
      this.el.bpGrid.addEventListener('click', function (e) {
        const slot = e.target.closest('.card-slot');
        if (!slot) return;
        const card = PC.CardRepo.getById(slot.dataset.id);
        if (!card) return;
        self.showDetail(card);
      });

      // 点击遮罩空白处关闭图鉴 / 详情（翻牌弹窗需点按钮）
      this.el.modalBackpack.addEventListener('click', function (e) {
        if (e.target === self.el.modalBackpack) self.closeBackpack();
      });
      this.el.modalDetail.addEventListener('click', function (e) {
        if (e.target === self.el.modalDetail) self.closeDetail();
      });
    },

    /* ---------------- HUD ---------------- */
    setStats: function (stats) {
      if (stats.phase != null) this.el.phase.textContent = stats.phase;
      if (stats.day != null) this.el.day.textContent = stats.day;
      if (stats.collected != null) this.el.collected.textContent = stats.collected;
      if (stats.total != null) this.el.total.textContent = stats.total;
      if (stats.soundOn != null) {
        this.el.btnSound.textContent = stats.soundOn ? '音效 开' : '音效 关';
        this.el.btnSound.classList.toggle('off', !stats.soundOn);
      }
    },

    /* ---------------- 背包图鉴 ---------------- */
    renderBackpack: function () {
      const repo = PC.CardRepo;
      const cards = repo.cards;
      const grid = this.el.bpGrid;

      grid.innerHTML = '';
      cards.forEach(function (card) {
        const collected = repo.isCollected(card.id);
        const slot = document.createElement('div');
        slot.className = 'card-slot r-' + card.rarity + (collected ? '' : ' locked');
        slot.dataset.id = card.id;

        const img = document.createElement('img');
        img.src = card.pixel_img_src;
        img.alt = collected ? card.card_name : '未收集的卡牌';
        img.loading = 'lazy';
        slot.appendChild(img);

        const name = document.createElement('div');
        name.className = 'slot-name';
        name.textContent = collected ? card.card_name : '？？？';
        slot.appendChild(name);

        if (!collected) {
          const q = document.createElement('div');
          q.className = 'slot-q';
          q.textContent = '?';
          slot.appendChild(q);
        }

        grid.appendChild(slot);
      });

      this.el.bpCount.textContent = repo.getCollectedCount() + ' / ' + repo.getTotal();
    },

    openBackpack: function () {
      this.closeDetail();
      this.renderBackpack();
      this.el.modalBackpack.classList.add('open');
      this.el.modalBackpack.setAttribute('aria-hidden', 'false');
    },

    closeBackpack: function () {
      this.el.modalBackpack.classList.remove('open');
      this.el.modalBackpack.setAttribute('aria-hidden', 'true');
    },

    /* ---------------- 抽卡翻牌 ---------------- */
    /**
     * 展示抽到的卡牌
     * @param {object} card 卡牌数据
     * @param {boolean} isNew 是否首次收集
     */
    showReveal: function (card, isNew) {
      const rarity = C.RARITY[card.rarity] || C.RARITY.common;

      this.el.revealHead.textContent = isNew ? '拾取成功 · 新卡牌 GET！' : '拾取成功 · 已收藏的重复卡牌';
      this.el.revealName.textContent = card.card_name;
      this.el.revealImg.src = card.pixel_img_src;
      this.el.revealRarity.textContent = rarity.label;
      this.el.revealRarity.className = 'card-rarity rarity-' + card.rarity;
      this.el.revealCategory.textContent = C.CATEGORY_LABEL[card.category] || '装备';
      this.el.revealDesc.textContent = card.description;
      this.el.revealNew.classList.toggle('show', !!isNew);
      this.el.flipFront.style.setProperty('--card-accent', rarity.color);

      // 重置翻牌动画
      const inner = this.el.flipInner;
      inner.classList.remove('flipping');
      void inner.offsetWidth;
      inner.classList.add('flipping');

      this.el.modalReveal.classList.add('open');
      this.el.modalReveal.setAttribute('aria-hidden', 'false');
    },

    closeReveal: function () {
      this.el.modalReveal.classList.remove('open');
      this.el.modalReveal.setAttribute('aria-hidden', 'true');
      this.el.flipInner.classList.remove('flipping');
    },

    /* ---------------- 卡牌详情 ---------------- */
    showDetail: function (card) {
      const collected = PC.CardRepo.isCollected(card.id);
      const rarity = C.RARITY[card.rarity] || C.RARITY.common;
      const category = C.CATEGORY_LABEL[card.category] || '装备';

      this.el.detailName.textContent = collected ? card.card_name : '未解锁的卡牌';
      this.el.detailImg.src = card.pixel_img_src;
      this.el.detailImg.classList.toggle('locked', !collected);
      this.el.detailImg.alt = collected ? card.card_name : '未解锁的卡牌';
      this.el.detailRarity.textContent = collected ? rarity.label : '？？？';
      this.el.detailRarity.className = collected ? 'rarity-' + card.rarity : '';
      this.el.detailCategory.textContent = category;
      this.el.detailId.textContent = '#' + String(card.id).padStart(2, '0');
      this.el.detailDesc.textContent = collected
        ? card.description
        : '尚未收集。继续在营地中探索，拾取柴禾或水壶即可抽取卡牌。';

      this.el.modalDetail.classList.add('open');
      this.el.modalDetail.setAttribute('aria-hidden', 'false');
    },

    closeDetail: function () {
      this.el.modalDetail.classList.remove('open');
      this.el.modalDetail.setAttribute('aria-hidden', 'true');
    },

    /* ---------------- 状态 ---------------- */
    isBackpackOpen: function () {
      return this.el.modalBackpack.classList.contains('open');
    },

    isRevealOpen: function () {
      return this.el.modalReveal.classList.contains('open');
    },

    isDetailOpen: function () {
      return this.el.modalDetail.classList.contains('open');
    },

    /** 任意弹窗打开时暂停世界更新 */
    isBlocking: function () {
      return this.isBackpackOpen() || this.isRevealOpen() || this.isDetailOpen();
    }
  };

  PC.UI = UI;
})();
