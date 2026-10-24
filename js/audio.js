/**
 * 音效模块（纯 WebAudio 合成，无外部音频资源）
 * - 拾取音效：短促的方波上行音
 * - 抽卡音效：按稀有度递增的音阶
 * - 篝火噼啪：白噪声 + 带通滤波的随机爆点
 * 浏览器要求用户交互后才能播放声音，因此在首次按键/点击时才创建 AudioContext。
 */
(function () {
  const PC = window.PC;
  const C = PC.CONFIG;

  const Audio = {
    ctx: null,
    master: null,
    noiseBuffer: null,
    enabled: true,
    crackleTimer: 0,

    init: function () {
      try {
        const saved = window.localStorage.getItem(C.SOUND_KEY);
        if (saved === 'off') this.enabled = false;
      } catch (err) {
        // 忽略存储异常
      }
      return this.enabled;
    },

    /** 首次交互时创建音频上下文（必须由用户手势触发） */
    ensure: function () {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.3 : 0;
      this.master.connect(this.ctx.destination);

      // 预生成 1 秒白噪声，供篝火噼啪复用
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    },

    setEnabled: function (on) {
      this.enabled = !!on;
      if (this.master) {
        this.master.gain.setTargetAtTime(this.enabled ? 0.3 : 0, this.ctx.currentTime, 0.02);
      }
      try {
        window.localStorage.setItem(C.SOUND_KEY, this.enabled ? 'on' : 'off');
      } catch (err) {
        // 忽略存储异常
      }
      return this.enabled;
    },

    toggle: function () {
      return this.setEnabled(!this.enabled);
    },

    /** 单个音符 */
    tone: function (freq, delay, duration, type, volume) {
      if (!this.ctx || !this.enabled) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume || 0.12, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    },

    /** 拾取：两个快速上行音 */
    pickup: function () {
      if (!this.enabled) return;
      this.ensure();
      this.tone(660, 0, 0.08, 'square', 0.1);
      this.tone(990, 0.07, 0.1, 'square', 0.09);
    },

    /** 抽卡：稀有度越高，音阶越长越亮 */
    reveal: function (rarity) {
      if (!this.enabled) return;
      this.ensure();
      const scaleMap = {
        common: [523, 659],
        rare: [523, 659, 784, 988],
        legendary: [523, 659, 784, 1046, 1318]
      };
      const notes = scaleMap[rarity] || scaleMap.common;
      const self = this;
      notes.forEach(function (f, i) {
        self.tone(f, i * 0.09, 0.16, 'square', 0.09);
      });
      if (rarity === 'legendary') {
        // 传说中的闪光感：叠加高八度的三角波
        notes.slice(-2).forEach(function (f, i) {
          self.tone(f * 2, 0.42 + i * 0.08, 0.24, 'triangle', 0.05);
        });
      }
    },

    /** 篝火噼啪：靠近篝火且开启音效时，随机间隔生成噪声爆点 */
    update: function (dt, nearFire) {
      if (!this.enabled) return;
      if (!this.ctx) return;

      if (!nearFire) {
        this.crackleTimer = Math.min(this.crackleTimer, 0.2);
        return;
      }

      this.crackleTimer -= dt;
      if (this.crackleTimer > 0) return;
      this.crackleTimer = 0.22 + Math.random() * 0.55;
      this.pop();
    },

    /** 单次噼啪声 */
    pop: function () {
      if (!this.ctx || !this.noiseBuffer || !this.enabled) return;
      const t0 = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900 + Math.random() * 1600;
      filter.Q.value = 1.2;

      const gain = this.ctx.createGain();
      const vol = 0.05 + Math.random() * 0.08;

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07 + Math.random() * 0.08);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
      src.stop(t0 + 0.2);
    }
  };

  PC.Audio = Audio;
})();
