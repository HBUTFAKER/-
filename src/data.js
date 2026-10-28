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

  // ===== 普攻连段：每个人一套四式，动作曲线在 art.js（PATHS / BODIES）=====
  // path=兵器轨迹 body=身体语言 style=刀光 sfx=音效
  // dur=动作时长(ms) ready=下次可出手 range=身前判定 mult=倍率 lunge=前冲
  // strike=判定落在动作的百分之几 hitLag=命中顿帧(ms) shake=震屏 back=反手背面判定系数
  XY.BASIC_COMBO = {
    // 悟空 · 金箍棒：轻快、花，四招四套轨迹
    wukong: [
      { key: 'chop', name: '劈', path: 'arc', body: 'chop', style: 'arc', sfx: 'swing',
        dur: 260, ready: 300, range: 68, mult: 0.92, lunge: 44, strike: 0.52, hitLag: 40, shake: 2.6 },
      { key: 'stab', name: '戳', path: 'thrust', body: 'thrust', style: 'thrust', sfx: 'thrust',
        dur: 200, ready: 252, range: 104, mult: 0.88, lunge: 190, strike: 0.46, hitLag: 46, shake: 2.0 },
      { key: 'lift', name: '挑', path: 'lift', body: 'lift', style: 'lift', sfx: 'swingHeavy', heavy: true,
        dur: 310, ready: 384, range: 82, mult: 1.16, lunge: 16, strike: 0.56, hitLag: 58, shake: 3.6 },
      { key: 'sweep', name: '甩', path: 'sweep', body: 'sweep', style: 'sweep', sfx: 'sweep', heavy: true,
        dur: 360, ready: 470, range: 106, mult: 1.40, lunge: 76, strike: 0.5, hitLag: 74, shake: 5.4, back: 0.62 },
    ],
    // 八戒 · 九齿钉耙：慢、重、大开大合，第四下原地抡一圈
    bajie: [
      { key: 'smash', name: '筑', path: 'smash', body: 'smash', style: 'arc', sfx: 'swingHeavy', heavy: true,
        dur: 400, ready: 500, range: 88, mult: 1.06, lunge: 34, strike: 0.6, hitLag: 68, shake: 6.0 },
      { key: 'reel', name: '搂', path: 'reel', body: 'reel', style: 'sweep', sfx: 'sweep',
        dur: 330, ready: 420, range: 96, mult: 1.02, lunge: 26, strike: 0.48, hitLag: 52, shake: 3.4, back: 0.42 },
      { key: 'ram', name: '撞', path: 'ram', body: 'charge', style: 'thrust', sfx: 'thrust',
        dur: 300, ready: 400, range: 76, mult: 0.96, lunge: 250, strike: 0.42, hitLag: 46, shake: 4.6 },
      { key: 'whirl', name: '抡', path: 'spin', body: 'sweep', style: 'sweep', sfx: 'sweep', heavy: true,
        dur: 460, ready: 620, range: 112, mult: 1.55, lunge: 60, strike: 0.55, hitLag: 84, shake: 7.4, back: 0.85 },
    ],
    // 唐僧 · 空手：轻、快、飘，掌/袖/腿三段加一记合十
    tangseng: [
      { key: 'palm', name: '推掌', path: 'palm', body: 'thrust', style: 'thrust', sfx: 'swing',
        dur: 210, ready: 258, range: 62, mult: 0.80, lunge: 74, strike: 0.44, hitLag: 30, shake: 1.4, fxDx: 18 },
      { key: 'sleeve', name: '拂袖', path: 'sleeve', body: 'sweep', style: 'sweep', sfx: 'sweep',
        dur: 240, ready: 300, range: 94, mult: 0.72, lunge: 30, strike: 0.48, hitLag: 28, shake: 1.2, fxDx: 12, fxDy: -2 },
      { key: 'kick', name: '侧踢', path: 'kick', body: 'kick', style: 'arc', sfx: 'swing',
        dur: 280, ready: 344, range: 70, mult: 1.06, lunge: 96, strike: 0.46, hitLag: 42, shake: 2.4, fxDx: 14, fxDy: 15 },
      { key: 'pray', name: '金刚掌', path: 'pray', body: 'calm', style: 'thrust', sfx: 'swingHeavy', heavy: true,
        dur: 380, ready: 480, range: 76, mult: 1.32, lunge: 12, strike: 0.58, hitLag: 62, shake: 3.4, fxDx: 26 },
    ],
    // 沙僧 · 降妖宝杖：沉、稳、贴身，全是短促重击
    shaseng: [
      { key: 'gouge', name: '铲', path: 'scoop', body: 'lift', style: 'lift', sfx: 'swingHeavy', heavy: true,
        dur: 330, ready: 410, range: 88, mult: 1.04, lunge: 36, strike: 0.56, hitLag: 54, shake: 4.2 },
      { key: 'sweepLow', name: '扫', path: 'sweepLow', body: 'lift', style: 'sweep', sfx: 'sweep',
        dur: 300, ready: 380, range: 102, mult: 0.98, lunge: 52, strike: 0.5, hitLag: 46, shake: 3.0 },
      { key: 'butt', name: '顶', path: 'butt', body: 'thrust', style: 'arc', sfx: 'thrust',
        dur: 190, ready: 242, range: 78, mult: 0.86, lunge: 136, strike: 0.4, hitLag: 34, shake: 2.4, fxDx: 18, fxDy: 8 },
      { key: 'press', name: '压顶', path: 'press', body: 'smash', style: 'lift', sfx: 'swingHeavy', heavy: true,
        dur: 400, ready: 500, range: 96, mult: 1.40, lunge: 24, strike: 0.58, hitLag: 72, shake: 5.8 },
    ],
    // 白龙马 · 龙枪：长、直、快，全靠距离和身法
    bailongma: [
      { key: 'pierce', name: '刺', path: 'thrust2', body: 'thrust', style: 'thrust', sfx: 'thrust',
        dur: 230, ready: 280, range: 128, mult: 0.95, lunge: 214, strike: 0.42, hitLag: 44, shake: 2.4 },
      { key: 'rise', name: '撩', path: 'lift2', body: 'lift', style: 'lift', sfx: 'swing',
        dur: 260, ready: 330, range: 96, mult: 1.08, lunge: 40, strike: 0.52, hitLag: 50, shake: 3.2 },
      { key: 'press', name: '压杆', path: 'parry', body: 'smash', style: 'arc', sfx: 'swing',
        dur: 240, ready: 300, range: 84, mult: 0.92, lunge: 22, strike: 0.46, hitLag: 38, shake: 2.6 },
      { key: 'backstab', name: '回马枪', path: 'back', body: 'sweep', style: 'thrust', sfx: 'thrust', heavy: true,
        dur: 340, ready: 430, range: 104, mult: 1.42, lunge: -70, strike: 0.56, hitLag: 68, shake: 5.0, back: 0.78, fxDx: -36 },
    ],
  };
  // 取某个角色的连段表；没有就退回悟空那套
  XY.comboFor = function (id) { return XY.BASIC_COMBO[id] || XY.BASIC_COMBO.wukong; };


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
  // ===== 敌人招式表 =====
  // 每只怪都有「普攻 + 技能」，不再是站着贴人扣血。
  //   type：melee 近身 / shot 远程 / dash 冲撞 / aoe 震地 / summon 召唤
  //   windup 起手（这段时间有红圈提示，玩家能躲）/ active 出手 / recover 收招
  //   range：近身是够得着的长度；远程/冲撞是 [最近, 最远]，超出就不放
  //   cd：两段之间的随机冷却区间（毫秒）
  //   tell：起手提示色
  XY.ENEMY_MOVES = {
    imp: [
      { key: 'claw', name: '抓挠', type: 'melee', range: 52, mult: 1,
        windup: 320, active: 110, recover: 300, cd: [820, 1300], tell: '#ffb35c' },
      { key: 'rock', name: '掷石', type: 'shot', range: [140, 360], mult: 0.85,
        windup: 520, active: 90, recover: 430, cd: [2200, 3200], tell: '#e08a4a',
        proj: { speed: 330, vy: -170, gravity: 620, r: 7, color: '#b08a5c', life: 2.6 } },
    ],
    wolf: [
      { key: 'bite', name: '撕咬', type: 'melee', range: 64, mult: 1.05,
        windup: 280, active: 110, recover: 250, cd: [700, 1150], tell: '#ff8a5e' },
      { key: 'pounce', name: '扑击', type: 'dash', range: [86, 240], mult: 1.35, speed: 520,
        windup: 430, active: 240, recover: 430, cd: [2500, 3500], tell: '#ff5e5e' },
    ],
    spider: [
      { key: 'fangs', name: '毒牙', type: 'melee', range: 50, mult: 0.95, dot: true,
        windup: 300, active: 100, recover: 300, cd: [880, 1320], tell: '#b06bff' },
      { key: 'web', name: '吐丝', type: 'shot', range: [110, 320], mult: 0.7, slow: true,
        windup: 470, active: 80, recover: 400, cd: [2300, 3300], tell: '#c9a6ff',
        proj: { speed: 300, vy: 0, gravity: 0, r: 6, color: '#c9a6ff', life: 2.2 } },
    ],
  };
  // 首领招式的公共库：每只首领从里面挑 3~4 个，配出自己的节奏
  XY.BOSS_MOVES = {
    slam: { key: 'slam', name: '重击', type: 'melee', range: 98, mult: 1.25,
      windup: 560, active: 120, recover: 520, cd: [1500, 2300], tell: '#ff7a4a', shake: 5 },
    sweep: { key: 'sweep', name: '横扫', type: 'melee', range: 134, mult: 1.1,
      windup: 470, active: 140, recover: 470, cd: [1700, 2500], tell: '#ffa94a', shake: 4 },
    charge: { key: 'charge', name: '冲撞', type: 'dash', range: [140, 430], mult: 1.4, speed: 560,
      windup: 620, active: 420, recover: 560, cd: [2600, 3600], tell: '#ff5e5e', shake: 6 },
    quake: { key: 'quake', name: '震地', type: 'aoe', range: [0, 200], radius: 200, mult: 1.2,
      windup: 700, active: 170, recover: 620, cd: [3000, 4200], tell: '#ffd479', shake: 10 },
    volley: { key: 'volley', name: '妖火', type: 'shot', range: [130, 540], mult: 1.0,
      windup: 640, active: 110, recover: 520, cd: [2200, 3000], tell: '#ff9a5e', shake: 3,
      proj: { speed: 340, vy: -90, gravity: 340, r: 9, color: '#ff9a5e', life: 3, count: 2, gap: 140 } },
    summon: { key: 'summon', name: '召妖', type: 'summon', range: [40, 620], mult: 0,
      windup: 760, active: 110, recover: 620, cd: [6200, 8200], tell: '#9ad0ff',
      count: 2, summonKind: 'imp' },
  };
  XY.movesFor = function (kind) {
    const list = (XY.ENEMY_MOVES && XY.ENEMY_MOVES[kind]) || [];
    return list.map((m) => Object.assign({}, m));
  };
  XY.bossMoves = function (keys) {
    const out = [];
    for (const k of (keys || [])) {
      const def = XY.BOSS_MOVES[k];
      if (def) out.push(Object.assign({}, def));
    }
    return out;
  };

  // ===== 首领：12 关各一只 =====
  // art.kind 决定 art.js 用哪套骨架画：bull/bear/bone/demon/beast/dragon/queen
  // art 里其余字段是同骨架的参数（颜色、披风、角、武器、口鼻）
  const bossDrop = (soul, a, b) => [
    { itemId: 'mat_soul', weight: 1, chance: 1, min: soul[0], max: soul[1] },
    { itemId: a[0], weight: 1, chance: a[2] === undefined ? 0.8 : a[2], min: a[1], max: a[1] + 1 },
    { itemId: b[0], weight: 1, chance: b[2] === undefined ? 0.7 : b[2], min: b[1], max: b[1] + 1 } ];
  XY.BOSSES = {
    mowang: { name: '混世魔王', title: '占山为王', hp: 430, attack: 15, defense: 8, moveSpeed: 84, aggroRange: 640,
      moves: ['slam', 'quake', 'summon'],
      art: { kind: 'demon', skin: '#5d6b52', cloth: '#3b2f24', horn: true, weapon: 'blade', plume: '#c0392b' },
      dropTable: bossDrop([2, 3], ['mat_stone', 2, 0.9], ['mat_wood', 2]) },
    dragon: { name: '毒龙', title: '涧底沉鳞', hp: 520, attack: 18, defense: 9, moveSpeed: 92, aggroRange: 640,
      moves: ['charge', 'volley', 'sweep'],
      art: { kind: 'dragon', scale: '#2f7d6b', belly: '#d9e8a8', horn: '#e6dcc4', eye: '#ffd479' },
      dropTable: bossDrop([2, 4], ['mat_herb', 2], ['mat_fire', 1]) },
    bear: { name: '黑熊精', title: '黑风大王', hp: 560, attack: 20, defense: 14, moveSpeed: 66, aggroRange: 640,
      moves: ['slam', 'charge', 'quake'],
      art: { kind: 'bear' },
      dropTable: bossDrop([2, 4], ['mat_stone', 2, 0.9], ['mat_herb', 1, 0.6]) },
    pig: { name: '猪妖王', title: '高老庄女婿', hp: 560, attack: 20, defense: 12, moveSpeed: 96, aggroRange: 640,
      moves: ['slam', 'charge', 'summon'],
      art: { kind: 'beast', fur: '#6b5442', furDark: '#493729', snout: 'pig', tusk: true, mane: '#c9a24a', scale: 1.05 },
      dropTable: bossDrop([2, 4], ['mat_wood', 3], ['mat_herb', 2]) },
    queen: { name: '蜘蛛精', title: '七情丝主', hp: 500, attack: 19, defense: 8, moveSpeed: 88, aggroRange: 640,
      moves: ['volley', 'summon', 'slam'],
      art: { kind: 'queen', skin: '#8a4bb0', cloth: '#3a1746' },
      dropTable: bossDrop([2, 4], ['mat_fire', 2], ['mat_soul', 1, 0.5]) },
    ape: { name: '河妖', title: '八百里流沙', hp: 590, attack: 21, defense: 13, moveSpeed: 78, aggroRange: 640,
      moves: ['sweep', 'charge', 'quake'],
      art: { kind: 'beast', fur: '#3f6b52', furDark: '#2a4a38', snout: 'ape', mane: null, scale: 1.12 },
      dropTable: bossDrop([2, 4], ['mat_herb', 3], ['mat_stone', 2]) },
    yellow: { name: '黄袍怪', title: '波月洞主', hp: 620, attack: 22, defense: 11, moveSpeed: 92, aggroRange: 640,
      moves: ['slam', 'charge', 'volley'],
      art: { kind: 'demon', skin: '#c9b48a', cloth: '#c9a03a', horn: false, weapon: 'spear', plume: '#e8e0c0' },
      dropTable: bossDrop([3, 5], ['mat_stone', 3], ['mat_herb', 2]) },
    bone: { name: '白骨精', title: '白骨夫人', hp: 540, attack: 24, defense: 7, moveSpeed: 104, aggroRange: 640,
      moves: ['sweep', 'volley', 'summon'],
      art: { kind: 'bone' },
      dropTable: bossDrop([3, 6], ['mat_wood', 2], ['mat_fire', 1, 0.6]) },
    lion: { name: '青狮', title: '狮驼岭大魔王', hp: 700, attack: 24, defense: 15, moveSpeed: 96, aggroRange: 640,
      moves: ['charge', 'slam', 'quake'],
      art: { kind: 'beast', fur: '#3f7f6a', furDark: '#2a5a4a', snout: 'lion', tusk: true, mane: '#1f4a3a', scale: 1.16 },
      dropTable: bossDrop([3, 5], ['mat_fire', 2], ['mat_stone', 3]) },
    redboy: { name: '红孩儿', title: '圣婴大王', hp: 640, attack: 26, defense: 9, moveSpeed: 104, aggroRange: 640,
      moves: ['slam', 'volley', 'quake'],
      art: { kind: 'demon', skin: '#e8b48a', cloth: '#c0392b', horn: false, weapon: 'spear', flame: true, small: true, plume: '#ff8a3a' },
      dropTable: bossDrop([3, 5], ['mat_fire', 3], ['mat_soul', 1, 0.5]) },
    fish: { name: '灵感大王', title: '通天河神', hp: 660, attack: 23, defense: 12, moveSpeed: 90, aggroRange: 640,
      moves: ['volley', 'charge', 'sweep'],
      art: { kind: 'beast', fur: '#c9762f', furDark: '#8a4a1a', snout: 'fish', mane: null, scale: 1.1, fin: '#e8b48a' },
      dropTable: bossDrop([3, 5], ['mat_herb', 3], ['mat_soul', 1, 0.5]) },
    bull: { name: '牛魔王', title: '平天大圣', hp: 760, attack: 26, defense: 16, moveSpeed: 76, aggroRange: 640,
      moves: ['slam', 'charge', 'quake', 'volley'],
      art: { kind: 'bull' },
      dropTable: bossDrop([3, 5], ['mat_fire', 2], ['mat_stone', 2]) },
  };
  XY.BOSS_ORDER = ['mowang', 'dragon', 'bear', 'pig', 'queen', 'ape', 'yellow', 'bone', 'lion', 'redboy', 'fish', 'bull'];
  XY.BOSS_BASE = XY.BOSSES.bull;

  // ===== 关卡（横版卷动）=====
  // kind：main 主线 / side 支线（支线靠 require 解锁，可以不打）
  // theme：程序化背景的底子（0 云海山峦 / 1 洞窟 / 2 火山），tint 是本关整体色调
  // intro：关卡前情的三行字；outro：过关后的一句后话（结算页显示）
  // require：支线的前置关卡下标（打完它才开）
  XY.LEVELS = [
    // —— 主线 1 ——
    { id: 'l1', kind: 'main', chapter: 1, theme: 0, tint: null,
      name: '第一回 · 花果山', sub: '旧地重游',
      width: 2400, height: 540, platforms: [
        [0, 500, 2400, 40], [360, 400, 160, 24], [680, 320, 180, 24], [1040, 420, 200, 24],
        [1500, 340, 220, 24], [1960, 300, 200, 24] ],
      spawns: [
        { type: 'imp', x: 520, y: 460, level: 1 }, { type: 'imp', x: 900, y: 460, level: 1 },
        { type: 'wolf', x: 1300, y: 460, level: 2 }, { type: 'imp', x: 1700, y: 460, level: 1 },
        { type: 'wolf', x: 1880, y: 460, level: 2 },
        { type: 'boss', boss: 'mowang', x: 2120, y: 380, level: 1 } ],
      goal: { x: 2330, y: 440 },
      intro: ['五百年后，五行山崩，猴王重回花果山。',
        '故地已荒，小妖占山为王，水帘洞前一片狼藉。',
        '把这些杂碎清干净——这是取经路上的第一课。'],
      outro: '山风穿过水帘，石桌上还留着当年的酒痕。',
      reward: { jade: 10, gold: 150 } },

    // —— 主线 2 ——
    { id: 'l2', kind: 'main', chapter: 2, theme: 1, tint: 'rgba(60,120,150,0.16)',
      name: '第二回 · 鹰愁涧', sub: '涧底有龙',
      width: 2600, height: 540, platforms: [
        [0, 500, 2600, 40], [300, 390, 150, 24], [560, 310, 170, 24], [900, 410, 190, 24],
        [1230, 330, 180, 24], [1580, 260, 210, 24], [1950, 370, 200, 24], [2280, 300, 180, 24] ],
      spawns: [
        { type: 'wolf', x: 420, y: 460, level: 2 }, { type: 'spider', x: 820, y: 460, level: 2 },
        { type: 'wolf', x: 1180, y: 460, level: 3 }, { type: 'spider', x: 1520, y: 460, level: 3 },
        { type: 'wolf', x: 1900, y: 460, level: 3 }, { type: 'imp', x: 2150, y: 460, level: 2 },
        { type: 'boss', boss: 'dragon', x: 2330, y: 380, level: 2 } ],
      goal: { x: 2530, y: 440 },
      intro: ['涧水森寒，白雾贴着水面走。',
        '传说涧里藏着一条犯了天条的龙，吞过取经人的白马。',
        '岸边的妖物，只是被龙气养肥的看门狗。'],
      outro: '涧底传来一声低沉的龙吟，随即归于寂静。',
      reward: { jade: 12, gold: 200 } },

    // —— 主线 3（首领：黑熊精）——
    { id: 'l3', kind: 'main', chapter: 3, theme: 1, tint: 'rgba(90,60,140,0.20)',
      name: '第三回 · 黑风洞', sub: '黑熊精',
      width: 2800, height: 540, platforms: [
        [0, 500, 2800, 40], [380, 380, 160, 24], [720, 300, 180, 24], [1080, 400, 200, 24],
        [1450, 320, 190, 24], [1820, 240, 210, 24], [2200, 360, 200, 24] ],
      spawns: [
        { type: 'spider', x: 500, y: 460, level: 3 }, { type: 'wolf', x: 950, y: 460, level: 3 },
        { type: 'imp', x: 1350, y: 460, level: 3 }, { type: 'spider', x: 1750, y: 460, level: 4 },
        { type: 'boss', boss: 'bear', x: 2450, y: 380, level: 4 } ],
      goal: { x: 2700, y: 440 },
      intro: ['黑风洞的洞口挂着一件袈裟，风一吹，血味就散开。',
        '黑熊精偷了佛宝，占了山洞，自封"黑风大王"。',
        '它皮糙肉厚，正面硬冲只会被一屁股坐扁。'],
      outro: '黑熊精跪在洞口，把袈裟一件件叠好，双手奉还。',
      reward: { jade: 16, gold: 320, items: { mat_soul: 2 } } },

    // —— 主线 4 ——
    { id: 'l4', kind: 'main', chapter: 4, theme: 0, tint: 'rgba(150,90,40,0.16)',
      name: '第四回 · 高老庄', sub: '女婿是头猪',
      width: 2600, height: 540, platforms: [
        [0, 500, 2600, 40], [240, 420, 200, 26], [620, 360, 180, 26], [980, 300, 200, 26],
        [1360, 380, 220, 26], [1760, 320, 200, 26], [2140, 260, 200, 26] ],
      spawns: [
        { type: 'imp', x: 430, y: 460, level: 3 }, { type: 'wolf', x: 800, y: 460, level: 4 },
        { type: 'imp', x: 1180, y: 460, level: 3 }, { type: 'wolf', x: 1600, y: 460, level: 4 },
        { type: 'imp', x: 2000, y: 460, level: 4 },
        { type: 'boss', boss: 'pig', x: 2320, y: 380, level: 4 } ],
      goal: { x: 2530, y: 440 },
      intro: ['高老庄的灯还亮着，庄丁却不敢出门。',
        '三年前招了个女婿，能吃能喝，喝多了会现出猪相。',
        '庄主说：不求降妖，只求把这门亲事退了。'],
      outro: '那猪妖拍了拍肚子，说"走就走"，倒先一步往西去了。',
      reward: { jade: 18, gold: 380 } },

    // —— 支线 1（前置：高老庄）——
    { id: 's1', kind: 'side', chapter: 0, theme: 1, tint: 'rgba(140,60,140,0.22)',
      name: '支线 · 盘丝洞', sub: '七情丝',
      width: 2400, height: 540, platforms: [
        [0, 500, 2400, 40], [320, 390, 170, 24], [660, 310, 190, 24], [1020, 390, 180, 24],
        [1380, 300, 200, 24], [1760, 380, 190, 24] ],
      spawns: [
        { type: 'spider', x: 460, y: 460, level: 4 }, { type: 'spider', x: 780, y: 460, level: 4 },
        { type: 'spider', x: 1120, y: 460, level: 4 }, { type: 'spider', x: 1470, y: 460, level: 5 },
        { type: 'spider', x: 1820, y: 460, level: 5 }, { type: 'spider', x: 1930, y: 460, level: 5 },
        { type: 'boss', boss: 'queen', x: 2120, y: 380, level: 4 } ],
      goal: { x: 2330, y: 440 },
      require: 3,
      intro: ['洞口垂着七色丝线，一根一根缠在骨头上。',
        '盘丝洞的蜘蛛精不图财，只织网——织到人走不动为止。',
        '这趟是私活，打不打随你，赏钱不薄。'],
      outro: '蛛丝被火一燎，整座洞窟像退潮一样塌下去。',
      reward: { jade: 20, gold: 300, items: { mat_fire: 2, mat_soul: 1 } } },

    // —— 主线 5 ——
    { id: 'l5', kind: 'main', chapter: 5, theme: 1, tint: 'rgba(30,90,110,0.22)',
      name: '第五回 · 流沙河', sub: '河底有将',
      width: 3000, height: 540, platforms: [
        [0, 500, 3000, 40], [420, 400, 150, 24], [760, 330, 170, 24], [1120, 420, 180, 24],
        [1500, 340, 190, 24], [1880, 270, 210, 24], [2260, 370, 190, 24], [2640, 310, 170, 24] ],
      spawns: [
        { type: 'wolf', x: 560, y: 460, level: 4 }, { type: 'spider', x: 950, y: 460, level: 4 },
        { type: 'imp', x: 1300, y: 460, level: 5 }, { type: 'wolf', x: 1700, y: 460, level: 4 },
        { type: 'spider', x: 2100, y: 460, level: 5 }, { type: 'wolf', x: 2500, y: 460, level: 5 },
        { type: 'boss', boss: 'ape', x: 2700, y: 380, level: 5 } ],
      goal: { x: 2930, y: 440 },
      intro: ['八百里流沙，鹅毛飘不起，芦花定底沉。',
        '河心立着一块界碑，碑后有人影，脖子上挂九个骷髅。',
        '他不让路，只是问：你也是去西天的？'],
      outro: '那大汉把骷髅串成一串，挂在颈上，默默跟在队伍最后。',
      reward: { jade: 20, gold: 420 } },

    // —— 支线 2（前置：流沙河）——
    { id: 's2', kind: 'side', chapter: 0, theme: 1, tint: 'rgba(150,120,40,0.18)',
      name: '支线 · 波月洞', sub: '黄袍客',
      width: 2600, height: 540, platforms: [
        [0, 500, 2600, 40], [340, 370, 180, 26], [720, 290, 190, 26], [1100, 380, 200, 26],
        [1500, 300, 190, 26], [1900, 370, 200, 26], [2260, 290, 180, 26] ],
      spawns: [
        { type: 'imp', x: 480, y: 460, level: 5 }, { type: 'wolf', x: 900, y: 460, level: 5 },
        { type: 'imp', x: 1330, y: 460, level: 5 }, { type: 'wolf', x: 1720, y: 460, level: 6 },
        { type: 'imp', x: 2150, y: 460, level: 5 },
        { type: 'boss', boss: 'yellow', x: 2320, y: 380, level: 5 } ],
      goal: { x: 2530, y: 440 },
      require: 5,
      intro: ['波月洞里有月亮，是人造的那种——一面铜镜吊在洞顶。',
        '黄袍客掳了宝象国的公主，说要在洞里过一辈子。',
        '顺手接的活，办完还有人情。'],
      outro: '铜镜碎了，月光散了一地，公主终于看见洞外的天。',
      reward: { jade: 22, gold: 360, items: { mat_stone: 2, mat_herb: 2 } } },

    // —— 主线 6（首领：白骨精）——
    { id: 'l6', kind: 'main', chapter: 6, theme: 0, tint: 'rgba(120,150,170,0.20)',
      name: '第六回 · 白骨岭', sub: '白骨精',
      width: 3000, height: 540, platforms: [
        [0, 500, 3000, 40], [420, 390, 150, 24], [700, 300, 170, 24], [1060, 400, 190, 24],
        [1400, 310, 190, 24], [1780, 240, 200, 24], [2140, 350, 190, 24] ],
      spawns: [
        { type: 'spider', x: 560, y: 460, level: 5 }, { type: 'wolf', x: 1000, y: 460, level: 5 },
        { type: 'spider', x: 1450, y: 460, level: 5 }, { type: 'wolf', x: 1850, y: 460, level: 6 },
        { type: 'boss', boss: 'bone', x: 2650, y: 380, level: 6 } ],
      goal: { x: 2930, y: 440 },
      intro: ['岭上白骨堆成山，风一过，骨头互相敲出声音。',
        '她变过村姑、变过老妇、变过老翁，三次都被一眼看穿。',
        '这一次她不装了——骨甲披身，白骨为刃。'],
      outro: '骨头散落一地，骨堆里刻着一行小字：「白骨夫人，本是山中一缕怨气。」',
      reward: { jade: 26, gold: 520, items: { mat_soul: 3 } } },

    // —— 支线 3（前置：白骨岭）——
    { id: 's3', kind: 'side', chapter: 0, theme: 2, tint: 'rgba(120,80,30,0.18)',
      name: '支线 · 狮驼岭', sub: '三妖聚',
      width: 3000, height: 540, platforms: [
        [0, 500, 3000, 40], [380, 400, 160, 24], [740, 320, 180, 24], [1120, 410, 190, 24],
        [1500, 330, 200, 24], [1880, 260, 190, 24], [2260, 370, 190, 24], [2600, 300, 170, 24] ],
      spawns: [
        { type: 'wolf', x: 520, y: 460, level: 6 }, { type: 'imp', x: 900, y: 460, level: 6 },
        { type: 'wolf', x: 1280, y: 460, level: 6 }, { type: 'imp', x: 1680, y: 460, level: 6 },
        { type: 'wolf', x: 2050, y: 460, level: 7 }, { type: 'imp', x: 2450, y: 460, level: 6 },
        { type: 'boss', boss: 'lion', x: 2700, y: 380, level: 6 } ],
      goal: { x: 2930, y: 440 },
      require: 7,
      intro: ['狮驼岭上四万八千小妖，旌旗遮天。',
        '三个妖王结拜，放话要拿尽天下取经人。',
        '硬闯是找死，但岭后有一条给活人走的小道——得先杀穿。'],
      outro: '岭上的旗倒了大半，剩下的妖物四散进林子。',
      reward: { jade: 26, gold: 480, items: { mat_fire: 2, mat_stone: 2 } } },

    // —— 主线 7 ——
    { id: 'l7', kind: 'main', chapter: 7, theme: 2, tint: 'rgba(180,60,30,0.20)',
      name: '第七回 · 火云洞', sub: '圣婴大王',
      width: 3200, height: 540, platforms: [
        [0, 500, 3200, 40], [460, 390, 170, 24], [820, 300, 180, 24], [1180, 400, 200, 24],
        [1560, 320, 190, 24], [1940, 260, 200, 24], [2320, 370, 190, 24], [2700, 300, 180, 24] ],
      spawns: [
        { type: 'spider', x: 600, y: 460, level: 6 }, { type: 'imp', x: 1000, y: 460, level: 6 },
        { type: 'spider', x: 1400, y: 460, level: 6 }, { type: 'wolf', x: 1800, y: 460, level: 7 },
        { type: 'imp', x: 2200, y: 460, level: 6 }, { type: 'spider', x: 2600, y: 460, level: 7 },
        { type: 'boss', boss: 'redboy', x: 2900, y: 380, level: 6 } ],
      goal: { x: 3130, y: 440 },
      intro: ['火云洞终年不熄，洞口的热浪能把人推回去。',
        '红孩儿会三昧真火，一口火喷出来，连石头都烧成琉璃。',
        '他不怕你打，他怕你不进洞。'],
      outro: '火灭之后，洞里只剩一地琉璃，映着天光。',
      reward: { jade: 30, gold: 580 } },

    // —— 支线 4（前置：火云洞）——
    { id: 's4', kind: 'side', chapter: 0, theme: 1, tint: 'rgba(40,110,150,0.24)',
      name: '支线 · 通天河', sub: '冰下骨',
      width: 2800, height: 540, platforms: [
        [0, 500, 2800, 40], [400, 410, 170, 24], [760, 340, 180, 24], [1120, 420, 190, 24],
        [1480, 330, 200, 24], [1860, 270, 200, 24], [2240, 380, 190, 24] ],
      spawns: [
        { type: 'spider', x: 550, y: 460, level: 7 }, { type: 'wolf', x: 950, y: 460, level: 7 },
        { type: 'spider', x: 1350, y: 460, level: 7 }, { type: 'wolf', x: 1750, y: 460, level: 7 },
        { type: 'spider', x: 2150, y: 460, level: 7 }, { type: 'wolf', x: 2300, y: 460, level: 7 },
        { type: 'boss', boss: 'fish', x: 2500, y: 380, level: 7 } ],
      goal: { x: 2730, y: 440 },
      require: 9,
      intro: ['通天河结了冰，冰下有东西在游，一路跟着你。',
        '村里人说，每年要一对童男童女，冰才不裂。',
        '今年没人肯交，冰面已经裂了三道。'],
      outro: '冰化了，河面浮起一层碎骨，顺水下流。',
      reward: { jade: 30, gold: 520, items: { mat_soul: 3, mat_herb: 2 } } },

    // —— 主线 8（终局首领：牛魔王）——
    { id: 'l8', kind: 'main', chapter: 8, theme: 2, tint: 'rgba(200,50,20,0.18)',
      name: '第八回 · 火焰山', sub: '牛魔王',
      width: 3400, height: 540, platforms: [
        [0, 500, 3400, 40], [420, 400, 180, 24], [800, 320, 190, 24], [1180, 420, 200, 24],
        [1560, 330, 200, 24], [1940, 250, 210, 24], [2320, 370, 200, 24], [2700, 300, 190, 24] ],
      spawns: [
        { type: 'spider', x: 600, y: 460, level: 7 }, { type: 'wolf', x: 1000, y: 460, level: 8 },
        { type: 'spider', x: 1450, y: 460, level: 7 }, { type: 'wolf', x: 1900, y: 460, level: 8 },
        { type: 'spider', x: 2350, y: 460, level: 8 },
        { type: 'boss', boss: 'bull', x: 3050, y: 380, level: 8 } ],
      goal: { x: 3330, y: 440 },
      intro: ['火焰山八百里，火头一起，天都是红的。',
        '牛魔王站在山脊上，扇子插在腰后，连头都不抬。',
        '这一战打完，八百里火焰山才过得去。'],
      outro: '芭蕉扇落在地上，山火一寸一寸退了下去。',
      reward: { jade: 45, gold: 900, items: { mat_soul: 4, mat_fire: 3 } } },
  ];

  // —— 关卡解锁（纯函数，测试里直接调）——
  // 只有"打过的关卡"能选；另外把紧接着的那一关也开放（不然永远迈不出第一步）。
  // 支线不看前后顺序，只看 require 那一关有没有通。
  XY.levelUnlocked = function (idx, cleared) {
    const list = XY.LEVELS || [];
    const lv = list[idx];
    if (!lv) return false;
    const done = Array.isArray(cleared) ? cleared : [];
    if (idx === 0) return true;
    if (done.indexOf(idx) >= 0) return true;          // 通过一次 = 永久可重打
    if (lv.kind === 'side') {
      if (Number.isInteger(lv.require)) return done.indexOf(lv.require) >= 0;
      return done.length > 0;
    }
    // 主线：上一"主线关"通了才开（支线夹在中间不挡路）
    for (let i = idx - 1; i >= 0; i--) {
      if (list[i].kind === 'main') return done.indexOf(i) >= 0;
    }
    return true;
  };
  // 下一关主线（跳过支线）；没有了返回 -1
  XY.nextMainAfter = function (idx) {
    const list = XY.LEVELS || [];
    for (let i = idx + 1; i < list.length; i++) if (list[i].kind === 'main') return i;
    return -1;
  };
  XY.mainLevels = function () { return (XY.LEVELS || []).filter((l) => l.kind === 'main'); };
  // 选关界面的排列：主线先排满（8 个 = 两行），支线在后面一排
  XY.levelGrid = function () {
    const main = [], side = [];
    (XY.LEVELS || []).forEach((l, i) => (l.kind === 'side' ? side : main).push(i));
    return main.concat(side);
  };
  // 已解锁里最该去的那一关（选关界面默认光标停这儿）：优先主线，其次支线
  XY.frontierLevel = function (cleared) {
    const list = XY.LEVELS || [];
    const done = Array.isArray(cleared) ? cleared : [];
    let side = -1;
    for (let i = 0; i < list.length; i++) {
      if (done.indexOf(i) >= 0) continue;              // 打过的先跳过
      if (!XY.levelUnlocked(i, done)) continue;
      if (list[i].kind === 'main') return i;
      if (side < 0) side = i;
    }
    if (side >= 0) return side;
    return Math.max(0, done.length ? Math.max.apply(null, done) : 0);
  };

  // ===== 剧情 / CG（大闹天宫开场）=====
  XY.STORY = {
    prologue: [
      { bgTop: '#1a1030', bgBottom: '#3a1d4d', glyph: '☄', title: '第一幕 · 大闹天宫', lines: ['花果山美猴王，习得七十二变、筋斗云。', '嫌弼马温官小，自封齐天大圣。'], duration: 2600 },
      { bgTop: '#4d1d1d', bgBottom: '#7a2e0e', glyph: '⚡', title: '蟠桃盛会', lines: ['偷蟠桃、盗仙丹，搅乱瑶池。', '玉帝震怒，十万天兵下界捉拿。'], duration: 2600 },
      { bgTop: '#0e2a4d', bgBottom: '#103a5a', glyph: '🔥', title: '八卦炉中', lines: ['悟空被投入太上老君八卦炉。', '七七四十九日，炼出火眼金睛。'], duration: 2600 },
      { bgTop: '#10241a', bgBottom: '#15402a', glyph: '⛰', title: '五行山下', lines: ['如来翻掌化山，将悟空压于五行山下。', '五百年后，取经之路开启——你的降妖录，由此开始。'], duration: 3000 },
    ],
    // 通关后的结局字幕（逐行淡入，按 Enter 直接回主菜单）
    ending: [
      '八百里火焰山，火退成了灰。',
      '师徒四人加一匹马，继续往西。',
      '前面还有九万八千里，还有数不清的洞、数不清的妖。',
      '但这一路，你已经知道该怎么走了。',
      '——西游·降妖录 · 全篇终',
    ],
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
