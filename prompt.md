# 项目名称：像素森林露营卡牌收集探索小游戏
整体要求：完整可运行项目，分为【前端游戏端】+【Node.js后端服务】，代码模块化、注释清晰，兼容后续接入MCP PostgreSQL插件；8bit像素游戏风格，满足：地图探索、WASD移动、碰撞、拾取道具、昼夜循环、抽卡、背包图鉴收集系统。

## 一、整体技术栈
【前端】
- HTML5 + Canvas 2D（游戏渲染主画布）
- TailwindCSS v3（UI弹窗、HUD、图鉴面板样式）
- Vanilla JavaScript（不引入Phaser等重型游戏引擎，原生canvas实现，方便阅读修改）
- 存储：localStorage 前端本地缓存兜底；axios 向后端请求卡牌、存档接口
- 像素渲染强制规则：所有图片渲染设置 image-rendering: pixelated; 关闭抗锯齿；使用等宽像素字体PressStart2P

【后端】
- Node.js + Express
- pg 包（postgresql驱动），连接PostgreSQL数据库
- cors 跨域、dotenv 管理数据库连接配置
- 轻量无鉴权版本（用于本地开发测试），后续可增加用户登录
- 后端职责：读取卡牌库、保存/读取玩家收集存档，不写复杂业务

【数据库】PostgreSQL
表1：camp_card 卡牌主表（卡牌元数据）
CREATE TABLE camp_card (
    id SERIAL PRIMARY KEY,
    card_name VARCHAR(64) NOT NULL,
    rarity VARCHAR(16) NOT NULL, -- enum: common / rare / legend
    description TEXT NOT NULL,
    pixel_img_src VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL -- enum: equipment / nature / creature
);
测试初始化数据：
INSERT INTO camp_card(card_name,rarity,description,pixel_img_src,category) VALUES
('帆布帐篷','common','轻便双人露营帐篷，林间过夜必备','assets/card/tent.png','equipment'),
('篝火','rare','夜晚取暖照明，是营地的中心','assets/card/fire.png','nature'),
('登山背包','common','大容量背包，可以装睡袋、炊具','assets/card/bag.png','equipment'),
('星空山野','legend','深夜晴朗森林，漫天银河','assets/card/starry_hill.png','nature'),
('小松鼠','rare','森林里的野生小松鼠，常在树干间跑动','assets/card/squirrel.png','creature'),
('复古油灯','common','柔和暖光，不会惊扰森林小动物','assets/card/lamp.png','equipment'),
('折叠炊具','common','露营煮热水、做饭的便携炊具','assets/card/cook.png','equipment'),
('萤火虫群','rare','夏夜林间飞舞的萤火虫，微光点点','assets/card/firefly.png','nature');

表2：player_save 玩家存档表
CREATE TABLE player_save (
    id SERIAL PRIMARY KEY,
    player_key VARCHAR(64) UNIQUE NOT NULL, -- 前端生成随机玩家标识，用于存档绑定
    collected_cards INT[] NOT NULL DEFAULT '{}', -- 已经收集到的卡牌id数组
    create_at TIMESTAMP DEFAULT NOW(),
    update_at TIMESTAMP DEFAULT NOW()
);

## 二、完整项目目录结构（严格按照这个结构输出代码）
pixel-camp-game/
├── frontend/                 # 前端游戏
│   ├── index.html            # 入口页面：canvas画布 + HUD + 图鉴弹窗DOM结构
│   ├── assets/
│   │   ├── tiles/            # 瓦片图：草地、树、石头、篝火
│   │   ├── player/           # 像素玩家小人素材
│   │   ├── card/             # 卡牌png素材
│   │   └── font/             # PressStart2P像素字体
│   ├── css/
│   │   └── style.css         # 补充tailwind之外自定义样式、字体引入
│   └── js/
│       ├── main.js           # 游戏入口、requestAnimationFrame主循环
│       ├── config.js         # 全局配置：地图尺寸、昼夜时间、抽卡概率、移动速度
│       ├── map.js            # 瓦片地图、障碍物判断、拾取物刷新逻辑
│       ├── player.js         # 玩家：位置、移动、碰撞检测、方向
│       ├── daynight.js       # 昼夜系统：时间计算、画面色调、星空渲染、篝火粒子
│       ├── pickup.js         # 拾取物逻辑、碰撞拾取、抽卡触发
│       ├── card.js           # 卡牌管理、后端卡牌数据拉取、抽卡概率算法
│       ├── ui.js             # HUD状态栏、图鉴面板、抽卡弹窗、详情弹窗DOM交互
│       └── api.js            # 封装axios请求，和后端接口通信
├── backend/                  # node后端
│   ├── .env                  # 环境变量：PG_HOST,PG_PORT,PG_USER,PG_PASS,PG_DB
│   ├── package.json
│   ├── server.js             # express入口，路由注册
│   ├── db.js                 # pg连接池初始化
│   └── routes/
│       ├── cardRoute.js      # 卡牌接口路由
│       └── saveRoute.js      # 玩家存档路由
└── README.md                 # 启动说明、建表SQL、部署说明

## 三、后端接口定义（必须实现）
1. GET /api/cards
作用：获取全部卡牌列表，返回json数组，前端游戏初始化调用
返回示例：[{id,card_name,rarity,description,pixel_img_src,category},...]

2. POST /api/save
入参：{playerKey: string, collectedCards: number[]}
作用：保存玩家收集卡牌存档，更新player_save表

3. GET /api/save/:playerKey
作用：根据playerKey读取该玩家已收集卡牌ID数组，游戏加载时读取存档

抽卡概率规则（后端不做随机，随机逻辑放前端，后端只存结果）
common: 70% | rare:25% | legend:5%

## 四、前端游戏核心逻辑要求
1. 瓦片地图
- 瓦片尺寸：32px；地图宽25格，高18格
- 瓦片类型：草地(可通行)、树木(障碍)、岩石(障碍)、篝火(固定点位，夜晚发光粒子)
- 拾取物：柴禾、水壶，随机在草地刷新；拾取后消失，30秒后在随机草地重新刷新

2. 玩家控制
- WASD / 上下方向键控制移动；移动速度 3px/帧
- 碰撞检测：碰到障碍瓦片停止移动，不能穿树穿石头
- 玩家是简单像素小人，4方向静态帧即可，不需要复杂动画

3. 昼夜循环系统（重点）
一轮完整昼夜：120游戏秒
0~40s：白天，画面亮度正常，绿色草地，无星空，篝火无发光
40~60s：黄昏，画面叠加橙色蒙版，逐步变暗
60~100s：夜晚，深蓝色蒙版，绘制像素星空点阵，篝火开启暖黄色粒子向上飘散动画
100~120s：黎明，蒙版逐步褪去，回到白天
画布全局用rgba叠加蒙版实现色调变化，不要换图

4. 拾取&抽卡流程
玩家坐标和拾取物坐标重叠 → 自动拾取 → 触发随机抽卡
→ 弹出像素风格翻卡弹窗，展示抽到卡牌；
→ 判断是否是新卡牌：新卡牌加入收集列表，更新进度；已经拥有则提示“已经拥有这张卡牌”

5. 图鉴背包系统
快捷键 B：打开图鉴面板；ESC：关闭图鉴面板
图鉴面板结构：
- 顶部：进度文字【收集：X / 总Y】+ 分类切换标签：全部｜装备｜风景｜小动物
- 网格布局展示所有卡牌
  ✅ 已收集：渲染完整卡牌图，右上角标注稀有度标签（普通绿色/稀有蓝色/传说金色）
  ❌ 未收集：灰色剪影占位图+像素问号
- 点击任意卡牌，弹出详情弹窗：卡牌名称、稀有度、分类、露营介绍文案

6. 存档逻辑
- 首次进入游戏：前端生成随机playerKey存入localStorage
- 游戏加载：优先请求后端 /api/save 读取存档；后端读取失败时，降级读取localStorage本地存档兜底
- 每次抽到新卡牌，自动调用POST /api/save同步存档到数据库

## 五、视觉&UI强制规范（像素风约束，不要破坏）
1. 全局开启像素渲染：image-rendering: pixelated; 所有canvas绘制、图片都生效
2. 字体：PressStart2P像素字体，所有按钮、文字、弹窗使用；禁止圆润无衬线现代字体
3. 配色体系
白天：主色 #4a7c39（草地绿）
黄昏：叠加 #ff8833 低透明度橙色蒙版
夜晚：叠加 #0a102b 半透明深蓝蒙版；篝火粒子 #ffaa44、#ffdd77
UI边框：黑色像素硬描边，4px块状边框，不要圆角渐变阴影
4. 弹窗样式：白底+黑色像素粗边框，按钮是像素矩形，hover轻微变色，点击闪一下

## 六、代码编写要求
1. 前后端代码分开，按上面目录输出，文件拆分严格按模块，不要全部挤在一个js里
2. 所有异步接口增加捕获错误、控制台提示
3. 代码内写中文注释，每个函数顶部写功能说明
4. 提供启动步骤：先执行sql建表 → 后端npm install && npm run dev → 打开前端index.html
5. 预留扩展注释标记：
   // @MCP-ADAPT：此处可对接WorkBuddy PostgreSQL MCP插件，替代http后端接口直接查询卡牌表
6. 不要引入额外大型游戏引擎，保持原生canvas实现，方便二次修改和接入MCP

## 七、可选彩蛋功能（一并实现，优先级低）
1. 夜晚篝火持续粒子发光效果
2. HUD右上角实时显示当前阶段：白天 / 黄昏 / 夜晚
3. 收集满全部卡牌后，弹出像素风格成就弹窗
4. 简单拾取音效、抽卡弹窗音效（audio标签，可开关）