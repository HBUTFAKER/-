// 静态数据层：角色 / 技能 / 法宝 / 物品 / 配方 / 关卡 / 剧情 / 敌人。
// UMD 模式：浏览器挂到 window.XY，Node 测试通过 require 取回（同一对象）。
(function (root) {
  const XY = (root.XY = root.XY || {});

  // ===== 角色（5 位可玩）=====
  XY.CHARACTERS = {
    wukong: {
      id: 'wukong', name: '孙悟空', title: '齐天大圣',
      base: { maxHp: 220, attack: 26, defense: 6, moveSpeed: 200, critRate: 0.12 },
      skills: ['wk_smash', 'wk_dash', 'wk_spin'],
      backstory: '花果山美猴王，大闹天宫后被压五行山下五百年。一身本事，一根金箍棒打遍三界。',
      color: '#f4c430', accent: '#c0392b', startTreasure: 'tr_wuxing',
    },
    bajie: {
      id: 'bajie', name: '猪八戒', title: '天蓬元帅',
      base: { maxHp: 300, attack: 22, defense: 12, moveSpeed: 170, critRate: 0.08 },
      skills: ['bj_rake', 'bj_counter', 'bj_eat'],
      backstory: '原天蓬元帅，错投猪胎。看似贪吃懒散，九齿钉耙下却毫不含糊。',
      color: '#9b7653', accent: '#5d4037',
    },
    tangseng: {
      id: 'tangseng', name: '唐僧', title: '金蝉子',
      base: { maxHp: 180, attack: 14, defense: 4, moveSpeed: 185, critRate: 0.05 },
      skills: ['ts_zeal', 'ts_sutra', 'ts_kasaya'],
      backstory: '金蝉子转世，十世修行的高僧。手无缚鸡之力，却有护体真经与坚定道心。',
      color: '#f5f5f5', accent: '#e0b020',
    },
    shaseng: {
      id: 'shaseng', name: '沙僧', title: '卷帘大将',
      base: { maxHp: 280, attack: 20, defense: 14, moveSpeed: 175, critRate: 0.07 },
      skills: ['ss_staff', 'ss_quicksand', 'ss_bind'],
      backstory: '原卷帘大将，贬落流沙河。沉稳少言，降妖宝杖一横，万夫莫开。',
      color: '#7f8c8d', accent: '#34495e',
    },
    bailongma: {
      id: 'bailongma', name: '白龙马', title: '西海三太子',
      base: { maxHp: 240, attack: 23, defense: 8, moveSpeed: 230, critRate: 0.1 },
      skills: ['bl_tail', 'bl_charge', 'bl_breath'],
      backstory: '西海龙王三太子，化身白马驮唐僧西行。化龙一击，龙息焚敌。',
      color: '#aed6f1', accent: '#2e86c1',
    },
  };
  XY.CHARACTER_ORDER = ['wukong', 'bajie', 'tangseng', 'shaseng', 'bailongma'];
  XY.getCharacter = (id) => XY.CHARACTERS[id];

  // ===== 成长曲线：每升一级自动提升（商店买到的属性另算）=====
  XY.GROWTH = { maxHp: 22, attack: 4, defense: 2, critRate: 0.004, moveSpeed: 1.2 };

  // ===== 普攻连段：四段四种招式 =====
  // 动作曲线在 art.js（swingProfile / attackMotion），刀光在 fx.js（style）
  // dur=动作时长(ms) ready=下次可出手 range=身前判定 mult=倍率 lunge=前冲
  // hitLag=命中顿帧(ms) shake=震屏 style=刀光样式 back=反手横扫的背面判定系数
  XY.BASIC_COMBO = [
    {
      key: 'chop', name: '劈', style: 'arc', sfx: 'swing',
      dur: 260, ready: 300, range: 68, mult: 0.92, lunge: 44, strike: 0.52,
      hitLag: 40, shake: 2.6,
    },
    {
      key: 'thrust', name: '戳', style: 'thrust', sfx: 'thrust',
      dur: 200, ready: 252, range: 104, mult: 0.88, lunge: 190, strike: 0.46,
      hitLag: 46, shake: 2.0,
    },
    {
      key: 'lift', name: '挑', style: 'lift', sfx: 'swingHeavy',
      dur: 310, ready: 384, range: 82, mult: 1.16, lunge: 16, strike: 0.56,
      hitLag: 58, shake: 3.6,
    },
    {
      key: 'sweep', name: '甩', style: 'sweep', sfx: 'sweep',
      dur: 360, ready: 470, range: 106, mult: 1.40, lunge: 76, strike: 0.5,
      hitLag: 74, shake: 5.4, back: 0.62,   // 反手回扫也能扫到身后 62%
    },
  ];

  // ===== 货币（三种，各管一摊）=====
  XY.CURRENCIES = {
    gold: { id: 'gold', name: '金币', color: '#f4c430', use: '属性商店' },
    jade: { id: 'jade', name: '仙玉', color: '#7CFC9B', use: '技能参悟' },
    soul: { id: 'soul', name: '妖魂', color: '#c39bff', use: '锻造神兵' },
  };

  // ===== 属性商店：金币买属性，越买越贵 =====
  XY.SHOP = [
    { key: 'attack', name: '攻击', step: 3, base: 120, rate: 1.32, max: 30, unit: '' },
    { key: 'maxHp', name: '气血', step: 20, base: 100, rate: 1.27, max: 30, unit: '' },
    { key: 'defense', name: '防御', step: 2, base: 110, rate: 1.30, max: 25, unit: '' },
    { key: 'critRate', name: '暴击', step: 0.02, base: 160, rate: 1.38, max: 12, unit: '%' },
    { key: 'moveSpeed', name: '身法', step: 4, base: 130, rate: 1.30, max: 15, unit: '' },
  ];

  // ===== 技能参悟：仙玉升级，每级 +10% 伤害 / -5.5% 冷却 =====
  XY.SKILL_MAX_LV = 5;
  XY.SKILL_JADE_COST = [60, 140, 300, 620]; // 升到 2/3/4/5 级所需仙玉

  // ===== 技能（每位 ≥3）=====
  XY.SKILLS = {
    wk_smash: { id: 'wk_smash', name: '如意棒击', characterId: 'wukong', kind: 'melee', anim: 'giantChop', multiplier: 1.55, cooldown: 1300, cost: 16, range: 168, description: '金箍棒骤然暴涨十丈，自天而降一记重劈。' },
    wk_dash: { id: 'wk_dash', name: '筋斗云突', characterId: 'wukong', kind: 'dash', anim: 'cloudDash', multiplier: 0.85, cooldown: 1500, cost: 22, range: 320, dashMul: 3.9, dashMs: 340, cloud: true, description: '踏筋斗云疾突，祥云缠身，一撞丈外。' },
    wk_spin: { id: 'wk_spin', name: '定海神针', characterId: 'wukong', kind: 'aoe', anim: 'throw', multiplier: 1.45, cooldown: 3800, cost: 46, range: 0, radius: 132, description: '掷出金箍棒，棒身空中急旋，插入大地激起冲击波。' },

    bj_rake: { id: 'bj_rake', name: '九齿钉耙', characterId: 'bajie', kind: 'melee', multiplier: 1.4, cooldown: 650, cost: 10, range: 80, description: '钉耙前捣，势大力沉。' },
    bj_counter: { id: 'bj_counter', name: '倒打一耙', characterId: 'bajie', kind: 'dash', multiplier: 0.9, cooldown: 1500, cost: 20, range: 200, description: '回身突进，耙击退敌。' },
    bj_eat: { id: 'bj_eat', name: '贪吃回元', characterId: 'bajie', kind: 'heal', multiplier: 0, cooldown: 6000, cost: 0, range: 0, healPct: 0.3, description: '吞下灵食，回复气血。' },

    ts_zeal: { id: 'ts_zeal', name: '紧箍真言', characterId: 'tangseng', kind: 'ranged', multiplier: 0.6, cooldown: 1100, cost: 14, range: 320, description: '真言遥击，克制妖邪。' },
    ts_sutra: { id: 'ts_sutra', name: '大乘真经', characterId: 'tangseng', kind: 'buff', multiplier: 0, cooldown: 8000, cost: 30, range: 0, description: '诵经增益，攻速与攻击提升。' },
    ts_kasaya: { id: 'ts_kasaya', name: '袈裟护体', characterId: 'tangseng', kind: 'buff', multiplier: 0, cooldown: 6000, cost: 20, range: 0, description: '金襕袈裟护身，防御大增。' },

    ss_staff: { id: 'ss_staff', name: '降妖宝杖', characterId: 'shaseng', kind: 'melee', multiplier: 1.45, cooldown: 600, cost: 10, range: 82, description: '宝杖砸落，稳如泰山。' },
    ss_quicksand: { id: 'ss_quicksand', name: '流沙卷', characterId: 'shaseng', kind: 'aoe', multiplier: 1.15, cooldown: 2800, cost: 35, range: 0, radius: 135, description: '卷起流沙，绞杀四周。' },
    ss_bind: { id: 'ss_bind', name: '降妖缚', characterId: 'shaseng', kind: 'ranged', multiplier: 1.0, cooldown: 1400, cost: 18, range: 300, description: '抛出缚妖索，遥击敌人。' },

    bl_tail: { id: 'bl_tail', name: '龙尾扫', characterId: 'bailongma', kind: 'aoe', multiplier: 1.2, cooldown: 800, cost: 12, range: 0, radius: 95, description: '龙尾横扫身周。' },
    bl_charge: { id: 'bl_charge', name: '化龙击', characterId: 'bailongma', kind: 'dash', multiplier: 0.95, cooldown: 1500, cost: 22, range: 240, description: '化龙疾冲，撞飞来敌。' },
    bl_breath: { id: 'bl_breath', name: '龙息', characterId: 'bailongma', kind: 'aoe', multiplier: 1.15, cooldown: 2600, cost: 35, range: 260, radius: 120, description: '喷吐龙息，焚敌一片。' },
  };
  XY.getSkill = (id) => XY.SKILLS[id];
  XY.skillsOf = (cid) => Object.values(XY.SKILLS).filter((s) => s.characterId === cid);

  // ===== 法宝（12 件，主动使用）=====
  XY.TREASURES = {
    tr_wuxing: { id: 'tr_wuxing', name: '五行珠', effect: 'aoe_damage', cooldown: 8000, power: 65, radius: 170, description: '引动金木水火土，炸裂四周之敌。', story: '太上老君炼丹炉旁所遗，蕴含五行真力。' },
    tr_kunxian: { id: 'tr_kunxian', name: '捆仙绳', effect: 'stun', cooldown: 12000, power: 0, range: 280, duration: 2500, description: '红光一闪，将敌定在原地。', story: '惧留孙佛门法宝，专捆神仙妖魔。' },
    tr_bajiao: { id: 'tr_bajiao', name: '芭蕉扇', effect: 'knockback', cooldown: 9000, power: 30, range: 220, description: '铁扇公主之扇，狂风卷敌并击退。', story: '罗刹女所执，一扇八万四千里。' },
    tr_zijin: { id: 'tr_zijin', name: '紫金铃', effect: 'dot', cooldown: 11000, power: 12, radius: 150, duration: 4000, description: '晃铃生烟火，持续灼烧范围内之敌。', story: '观音菩萨赐金毛犼，铃响火起。' },
    tr_qixing: { id: 'tr_qixing', name: '七星剑', effect: 'aoe_damage', cooldown: 7000, power: 110, radius: 90, description: '剑光如七星垂落，单体重斩。', story: '截教法宝，锋芒贯日。' },
    tr_yujing: { id: 'tr_yujing', name: '玉净瓶', effect: 'heal', cooldown: 14000, power: 0, description: '甘露倾洒，回复大量气血。', story: '观音净瓶杨柳，起死回生。' },
    tr_fenghuo: { id: 'tr_fenghuo', name: '风火轮', effect: 'speed', cooldown: 10000, power: 0, duration: 5000, description: '脚踏风火，身法暴增并灼烧所过之处。', story: '哪吒随身之宝，风助火势。' },
    tr_hulu: { id: 'tr_hulu', name: '红葫芦', effect: 'instant_kill_weak', cooldown: 16000, power: 0, range: 320, description: '唤名即收，血量过弱的妖怪当场被装走。', story: '银角大王法宝，叫你名姓便应声入葫。' },
    tr_huntian: { id: 'tr_huntian', name: '混天绫', effect: 'aoe_damage', cooldown: 9000, power: 45, radius: 140, description: '红绫翻卷，捆缚并绞伤四周。', story: '哪吒混天绫，自动捆敌。' },
    tr_qiankun: { id: 'tr_qiankun', name: '乾坤圈', effect: 'aoe_damage', cooldown: 9000, power: 55, radius: 150, description: '金圈飞旋，去而复返，横扫一片。', story: '哪吒护身金圈，如意变化。' },
    tr_jingang: { id: 'tr_jingang', name: '金刚琢', effect: 'stun', cooldown: 12000, power: 20, range: 300, duration: 2000, description: '白亮金圈击中并拉拽、击晕敌人。', story: '太上老君防身之宝，套万物。' },
    tr_dingfeng: { id: 'tr_dingfeng', name: '定风丹', effect: 'shield', cooldown: 15000, power: 0, duration: 6000, description: '服丹立起护罩，短时免疫击退与控制。', story: '灵吉菩萨所赠，破黄风怪三昧神风。' },
  };
  XY.getTreasure = (id) => XY.TREASURES[id];

  // ===== 材料 + 可锻造的武器/护甲/饰物（三档）=====
  XY.ITEMS = {
    mat_wood: { id: 'mat_wood', name: '桃木枝', kind: 'material', description: '花果山常见的桃木，可作法器之材。' },
    mat_stone: { id: 'mat_stone', name: '玄铁石', kind: 'material', description: '坚硬的黑色矿石，重而锋利。' },
    mat_herb: { id: 'mat_herb', name: '灵芝草', kind: 'material', description: '蕴含灵气的仙草。' },
    mat_fire: { id: 'mat_fire', name: '三昧火种', kind: 'material', description: '残存的火灵之力。' },
    mat_soul: { id: 'mat_soul', name: '妖魂碎片', kind: 'material', description: '被击败妖怪残留的妖魂。' },

    // —— 兵器 ——
    eq_stick: { id: 'eq_stick', name: '桃木棍', kind: 'treasure', slot: 'weapon', tier: 1, rarity: 'common', description: '削桃木为棍，聊胜于无。', bonus: { attack: 7 } },
    eq_iron: { id: 'eq_iron', name: '玄铁棍', kind: 'treasure', slot: 'weapon', tier: 2, rarity: 'rare', description: '玄铁铸就，重逾百斤。', bonus: { attack: 15, critRate: 0.03 } },
    eq_staff: { id: 'eq_staff', name: '如意金箍棒', kind: 'treasure', slot: 'weapon', tier: 3, rarity: 'epic', description: '重一万三千斤，攻击与暴击大涨。', bonus: { attack: 26, critRate: 0.1 } },

    // —— 护甲 ——
    eq_cloth: { id: 'eq_cloth', name: '粗布衣', kind: 'treasure', slot: 'armor', tier: 1, rarity: 'common', description: '缝补过的粗布，挡得住爪牙。', bonus: { defense: 4, maxHp: 20 } },
    eq_chain: { id: 'eq_chain', name: '锁子甲', kind: 'treasure', slot: 'armor', tier: 2, rarity: 'rare', description: '环环相扣，刀枪难入。', bonus: { defense: 11, maxHp: 48 } },
    eq_robe: { id: 'eq_robe', name: '锁子黄金甲', kind: 'treasure', slot: 'armor', tier: 3, rarity: 'epic', description: '护体金甲，防御与血量提升。', bonus: { defense: 18, maxHp: 90 } },

    // —— 饰物 ——
    eq_sandals: { id: 'eq_sandals', name: '麻编草鞋', kind: 'treasure', slot: 'trinket', tier: 1, rarity: 'common', description: '走山路不磨脚。', bonus: { moveSpeed: 13 } },
    eq_cloudboots: { id: 'eq_cloudboots', name: '云纹靴', kind: 'treasure', slot: 'trinket', tier: 2, rarity: 'rare', description: '靴底绣云纹，脚步轻快。', bonus: { moveSpeed: 28, critRate: 0.02 } },
    eq_boots: { id: 'eq_boots', name: '筋斗云履', kind: 'treasure', slot: 'trinket', tier: 3, rarity: 'epic', description: '踏云而行，身法更快、更易暴击。', bonus: { moveSpeed: 48, critRate: 0.05 } },
  };
  XY.RARITY = {
    common: { name: '凡品', color: '#9fb0c8' },
    rare: { name: '灵品', color: '#5cc8ff' },
    epic: { name: '神品', color: '#ffb35c' },
  };
  XY.RECIPES = [
    // 一档：桃木 + 灵芝，新手就能打
    { id: 'r_stick', name: '削制·桃木棍', tier: 1, inputs: { mat_wood: 4 }, gold: 0, output: { itemId: 'eq_stick', count: 1 }, description: '四根桃木削成一根棍，先有个称手的。' },
    { id: 'r_cloth', name: '缝制·粗布衣', tier: 1, inputs: { mat_wood: 2, mat_herb: 3 }, gold: 0, output: { itemId: 'eq_cloth', count: 1 }, description: '桃木纤维混灵芝汁，缝出结实的布甲。' },
    { id: 'r_sandals', name: '编结·麻编草鞋', tier: 1, inputs: { mat_wood: 3, mat_herb: 1 }, gold: 0, output: { itemId: 'eq_sandals', count: 1 }, description: '草绳编底，走山路不磨脚。' },
    // 二档：玄铁 + 火种
    { id: 'r_iron', name: '锻打·玄铁棍', tier: 2, inputs: { mat_stone: 4, mat_wood: 3 }, gold: 200, output: { itemId: 'eq_iron', count: 1 }, description: '玄铁反复锻打，棍身沉而不折。' },
    { id: 'r_chain', name: '锻造·锁子甲', tier: 2, inputs: { mat_stone: 4, mat_herb: 2 }, gold: 180, output: { itemId: 'eq_chain', count: 1 }, description: '千枚铁环相扣，刀枪难入。' },
    { id: 'r_cloudboots', name: '凝云·云纹靴', tier: 2, inputs: { mat_herb: 4, mat_fire: 2 }, gold: 180, output: { itemId: 'eq_cloudboots', count: 1 }, description: '引三昧真火凝云为靴。' },
    // 三档：妖魂 + 火种，须打首领
    { id: 'r_staff', name: '铸炼·如意金箍棒', tier: 3, inputs: { mat_stone: 5, mat_soul: 4, mat_fire: 3 }, gold: 800, output: { itemId: 'eq_staff', count: 1 }, description: '集玄铁、妖魂与真火，铸出传说兵器。' },
    { id: 'r_robe', name: '织造·锁子黄金甲', tier: 3, inputs: { mat_stone: 4, mat_herb: 5, mat_soul: 3 }, gold: 700, output: { itemId: 'eq_robe', count: 1 }, description: '金丝织甲，魂魄为线。' },
    { id: 'r_boots', name: '踏云·筋斗云履', tier: 3, inputs: { mat_fire: 4, mat_soul: 3, mat_herb: 3 }, gold: 600, output: { itemId: 'eq_boots', count: 1 }, description: '一团祥云锁进靴底，起落如风。' },
  ];
  XY.getItem = (id) => XY.ITEMS[id];

  // ===== 敌人基础属性 + 掉落表 =====
  XY.ENEMY_BASE = {
    imp: { name: '小妖', hp: 40, attack: 8, defense: 2, moveSpeed: 60, aggroRange: 260, dropTable: [
      { itemId: 'mat_wood', weight: 1, chance: 0.5, min: 1, max: 2 },
      { itemId: 'mat_soul', weight: 1, chance: 0.25, min: 1, max: 1 } ] },
    wolf: { name: '妖狼', hp: 70, attack: 12, defense: 4, moveSpeed: 110, aggroRange: 320, dropTable: [
      { itemId: 'mat_stone', weight: 1, chance: 0.5, min: 1, max: 2 },
      { itemId: 'mat_herb', weight: 1, chance: 0.35, min: 1, max: 1 } ] },
    spider: { name: '毒蛛', hp: 55, attack: 14, defense: 3, moveSpeed: 90, aggroRange: 300, dropTable: [
      { itemId: 'mat_fire', weight: 1, chance: 0.4, min: 1, max: 1 },
      { itemId: 'mat_soul', weight: 1, chance: 0.3, min: 1, max: 1 },
      { itemId: 'mat_herb', weight: 1, chance: 0.3, min: 1, max: 1 } ] },
  };
  XY.BOSS_BASE = { name: '牛魔王', hp: 600, attack: 22, defense: 10, moveSpeed: 70, aggroRange: 9999, dropTable: [
    { itemId: 'mat_soul', weight: 1, chance: 1, min: 3, max: 5 },
    { itemId: 'mat_fire', weight: 1, chance: 0.8, min: 2, max: 3 },
    { itemId: 'mat_stone', weight: 1, chance: 0.8, min: 2, max: 3 } ] };

  // ===== 关卡（横版卷动）=====
  XY.LEVELS = [
    { id: 1, name: '第一关 · 花果山', width: 2400, height: 540, platforms: [
        [0, 500, 2400, 40], [360, 400, 160, 24], [680, 320, 180, 24], [1040, 420, 200, 24],
        [1500, 340, 220, 24], [1960, 300, 200, 24] ],
      spawns: [
        { type: 'imp', x: 520, y: 460, level: 1 }, { type: 'imp', x: 900, y: 460, level: 1 },
        { type: 'wolf', x: 1300, y: 460, level: 2 }, { type: 'imp', x: 1700, y: 460, level: 1 },
        { type: 'wolf', x: 2100, y: 460, level: 2 } ],
      goal: { x: 2330, y: 440 } },
    { id: 2, name: '第二关 · 黑风洞', width: 2600, height: 540, platforms: [
        [0, 500, 2600, 40], [300, 380, 140, 24], [560, 300, 160, 24], [860, 410, 180, 24],
        [1180, 330, 180, 24], [1520, 250, 200, 24], [1900, 380, 200, 24], [2240, 300, 200, 24] ],
      spawns: [
        { type: 'wolf', x: 480, y: 460, level: 2 }, { type: 'spider', x: 980, y: 460, level: 2 },
        { type: 'wolf', x: 1400, y: 460, level: 3 }, { type: 'spider', x: 1760, y: 460, level: 3 },
        { type: 'imp', x: 2050, y: 460, level: 2 }, { type: 'wolf', x: 2380, y: 460, level: 3 } ],
      goal: { x: 2530, y: 440 } },
    { id: 3, name: '第三关 · 火焰山 · 牛魔王', width: 2000, height: 540, platforms: [
        [0, 500, 2000, 40], [320, 400, 180, 24], [700, 340, 200, 24], [1120, 400, 200, 24], [1520, 340, 220, 24] ],
      spawns: [
        { type: 'spider', x: 600, y: 460, level: 3 }, { type: 'wolf', x: 1000, y: 460, level: 3 },
        { type: 'boss', x: 1650, y: 380, level: 5 } ],
      goal: { x: 1900, y: 440 } },
  ];

  // ===== 剧情 / CG（大闹天宫开场）=====
  XY.STORY = {
    prologue: [
      { bgTop: '#1a1030', bgBottom: '#3a1d4d', glyph: '☄', title: '第一幕 · 大闹天宫', lines: ['花果山美猴王，习得七十二变、筋斗云。', '嫌弼马温官小，自封齐天大圣。'], duration: 2600 },
      { bgTop: '#4d1d1d', bgBottom: '#7a2e0e', glyph: '⚡', title: '蟠桃盛会', lines: ['偷蟠桃、盗仙丹，搅乱瑶池。', '玉帝震怒，十万天兵下界捉拿。'], duration: 2600 },
      { bgTop: '#0e2a4d', bgBottom: '#103a5a', glyph: '🔥', title: '八卦炉中', lines: ['悟空被投入太上老君八卦炉。', '七七四十九日，炼出火眼金睛。'], duration: 2600 },
      { bgTop: '#10241a', bgBottom: '#15402a', glyph: '⛰', title: '五行山下', lines: ['如来翻掌化山，将悟空压于五行山下。', '五百年后，取经之路开启——你的降妖录，由此开始。'], duration: 3000 },
    ],
    levelIntros: {
      1: '花果山旧地，小妖作乱。悟空脱困后第一战，清扫故园。',
      2: '黑风洞中黑熊精窃袈裟，妖风阵阵。',
      3: '火焰山烈焰焚天，牛魔王据守，终局之战。',
    },
  };

  // ===== 每位角色独立的开场 CG =====
  // 选谁就播谁那段前史，不再全员共用悟空的大闹天宫。都是四幕，节奏统一。
  XY.STORY.charCg = {
    wukong: XY.STORY.prologue,

    bajie: [
      { bgTop: '#2a1a3a', bgBottom: '#4d2a5c', glyph: '🍑', title: '第一幕 · 天蓬元帅', lines: ['天庭水军八万，皆归天蓬元帅统率。', '蟠桃会上贪杯，醉醺醺离了席。'], duration: 2600 },
      { bgTop: '#3a1a2a', bgBottom: '#6b1f33', glyph: '🌙', title: '第二幕 · 醉闯广寒', lines: ['误入广寒宫，戏弄嫦娥。', '玉帝震怒，两千锤杖责，贬下凡尘。'], duration: 2600 },
      { bgTop: '#2a2318', bgBottom: '#4a3a1e', glyph: '🐷', title: '第三幕 · 错投猪胎', lines: ['投胎误入畜生道，落得猪头人身。', '流落福陵山云栈洞，吃人度日。'], duration: 2600 },
      { bgTop: '#1a2418', bgBottom: '#2e4020', glyph: '🏠', title: '第四幕 · 高老庄', lines: ['观音点化，赐名猪悟能。', '在此等候取经人，却先等来一场妖祸。'], duration: 3000 },
    ],

    tangseng: [
      { bgTop: '#2a2010', bgBottom: '#4d3818', glyph: '🪷', title: '第一幕 · 金蝉遭贬', lines: ['如来座下二弟子金蝉子，轻慢佛法。', '贬入轮回，转世为凡。'], duration: 2600 },
      { bgTop: '#10202a', bgBottom: '#173a4d', glyph: '🚣', title: '第二幕 · 江流儿', lines: ['父陈光瑞赴任遇害，母殷温娇忍辱偷生。', '婴儿顺江漂流，被金山寺法明和尚救起。'], duration: 2800 },
      { bgTop: '#2a2418', bgBottom: '#4d4020', glyph: '📜', title: '第三幕 · 奉旨西行', lines: ['唐王赐号三藏，西天取经。', '手无缚鸡之力，却敢一人上路。'], duration: 2600 },
      { bgTop: '#241a2a', bgBottom: '#3d2a4d', glyph: '🙏', title: '第四幕 · 出长安', lines: ['妖气蔽日，佛光亦可行。', '此去十万八千里，步步是劫。'], duration: 3000 },
    ],

    shaseng: [
      { bgTop: '#1a1a2a', bgBottom: '#2a2a4d', glyph: '🛡', title: '第一幕 · 卷帘大将', lines: ['玉帝身边卷帘大将，掌銮驾仪仗。', '失手打碎琉璃盏，一朝跌落。'], duration: 2600 },
      { bgTop: '#0e1a24', bgBottom: '#12303a', glyph: '💧', title: '第二幕 · 贬落流沙', lines: ['贬入流沙河，每七日飞剑穿胸百余下。', '苦楚无边，怨气成瘴。'], duration: 2600 },
      { bgTop: '#141a1a', bgBottom: '#1f2e26', glyph: '💀', title: '第三幕 · 流沙吃人', lines: ['河中吃人无数，颈挂九个骷髅。', '皆是前世的取经人。'], duration: 2600 },
      { bgTop: '#1a2418', bgBottom: '#2a3d22', glyph: '🪔', title: '第四幕 · 皈依佛门', lines: ['观音点化，法名悟净。', '在此赎尽前愆，等候师父。'], duration: 3000 },
    ],

    bailongma: [
      { bgTop: '#0e1a2a', bgBottom: '#12304d', glyph: '🐉', title: '第一幕 · 西海龙子', lines: ['西海龙王三太子敖烈，纵火烧了殿上明珠。', '父王上表，告其忤逆。'], duration: 2600 },
      { bgTop: '#2a1a1a', bgBottom: '#4d2020', glyph: '⚔', title: '第二幕 · 忤逆之罪', lines: ['玉帝判斩，悬于天柱。', '观音求情，免死贬下凡尘。'], duration: 2600 },
      { bgTop: '#0e2028', bgBottom: '#123a40', glyph: '🌊', title: '第三幕 · 鹰愁涧', lines: ['盘踞鹰愁涧，吞了唐僧的白马。', '涧水森寒，龙气未散。'], duration: 2600 },
      { bgTop: '#1a2028', bgBottom: '#2a3540', glyph: '🐎', title: '第四幕 · 化马驮经', lines: ['观音点化，化作白龙马。', '驮着师父，一路西行。'], duration: 3000 },
    ],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
