/**
 * 内置卡牌数据（本地兜底数据）
 * 字段与 PostgreSQL 表 camp_card 保持一致：
 *   id, card_name, rarity, description, pixel_img_src, category
 * 另附 artKey：前端像素画笔的键名；pixel_img_src 在启动时由 cardArt 生成 dataURL。
 * rarity 取值：common（普通）/ rare（稀有）/ legendary（传说）
 * category 取值：gear（装备）/ scenery（风景）/ animal（小动物）
 */
(function () {
  const PC = (window.PC = window.PC || {});

  PC.CARD_DATA = [
    // ---------- 装备 ----------
    {
      id: '1',
      card_name: '铜芯提灯',
      rarity: 'common',
      category: 'gear',
      description: '黄铜灯罩里跳动着小小的火苗，把营地的夜路照成暖橙色。',
      pixel_img_src: null,
      artKey: 'lantern'
    },
    {
      id: '2',
      card_name: '帆布帐篷',
      rarity: 'common',
      category: 'gear',
      description: '支起营地的第一件事。帆布的味道混着松针，就是旅途开始的气味。',
      pixel_img_src: null,
      artKey: 'tent'
    },
    {
      id: '3',
      card_name: '搪瓷杯',
      rarity: 'common',
      category: 'gear',
      description: '磕掉一块漆的老杯子，装过咖啡、热可可，也装过一整夜的雨水。',
      pixel_img_src: null,
      artKey: 'mug'
    },
    {
      id: '4',
      card_name: '林间手斧',
      rarity: 'rare',
      category: 'gear',
      description: '斧刃被磨得发亮，劈柴声是夜晚最踏实的节拍。',
      pixel_img_src: null,
      artKey: 'axe'
    },
    {
      id: '5',
      card_name: '星尘水壶',
      rarity: 'legendary',
      category: 'gear',
      description: '壶身像盛着一整条银河。据说在流星夜灌满的热水，永远不会凉。',
      pixel_img_src: null,
      artKey: 'star_kettle'
    },

    // ---------- 风景 ----------
    {
      id: '6',
      card_name: '晨雾松林',
      rarity: 'common',
      category: 'scenery',
      description: '清晨的松林被雾气裹住，脚步声都变得轻了。',
      pixel_img_src: null,
      artKey: 'pine_mist'
    },
    {
      id: '7',
      card_name: '落日山脊',
      rarity: 'common',
      category: 'scenery',
      description: '太阳落进山脊的缝隙，天空像被烧成橘红色的炭。',
      pixel_img_src: null,
      artKey: 'sunset_ridge'
    },
    {
      id: '8',
      card_name: '镜湖倒影',
      rarity: 'rare',
      category: 'scenery',
      description: '湖面静得能照出第二个月亮，风一来就碎成一片银色。',
      pixel_img_src: null,
      artKey: 'mirror_lake'
    },
    {
      id: '9',
      card_name: '银河营地',
      rarity: 'legendary',
      category: 'scenery',
      description: '关掉所有灯以后，银河就落在帐篷顶上，像一条发光的河。',
      pixel_img_src: null,
      artKey: 'milky_way'
    },

    // ---------- 小动物 ----------
    {
      id: '10',
      card_name: '篝火松鼠',
      rarity: 'common',
      category: 'animal',
      description: '总在篝火边捡坚果的小家伙，尾巴比火苗还蓬松。',
      pixel_img_src: null,
      artKey: 'squirrel'
    },
    {
      id: '11',
      card_name: '夜行狐狸',
      rarity: 'rare',
      category: 'animal',
      description: '只在夜里出现的访客，远远看一会儿火光，又悄无声息地走了。',
      pixel_img_src: null,
      artKey: 'fox'
    },
    {
      id: '12',
      card_name: '月光白鹿',
      rarity: 'legendary',
      category: 'animal',
      description: '传说中只在满月现身的白鹿，蹄印会留下淡淡的银光。',
      pixel_img_src: null,
      artKey: 'moon_deer'
    }
  ];
})();
