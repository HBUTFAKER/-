# 西游降妖录

一款西游记题材的 2D 横版动作闯关小游戏，浏览器直接运行，零依赖。

5 名角色（悟空 / 八戒 / 唐僧 / 沙僧 / 白龙马）、15 个专属技能、12 件法宝、背包合成、三关主题立绘背景、Boss 战。

## 直接玩

不用装任何东西：

1. 点页面右上角绿色 `Code` → `Download ZIP`
2. 解压
3. 双击 **`西游降妖录.html`**

单文件，所有代码和美术都在里面，断网也能玩。

## 操作

| 按键 | 作用 |
| --- | --- |
| `A` `D` | 左右移动（连按两次触发奔跑） |
| `W` | 跳跃 / 空中再按一次二段跳 |
| `S` | 下蹲 |
| `J` | 普通攻击（连按走「劈 → 戳 → 挑」三段，判定距离与倍率不同） |
| `K` `U` `I` | 技能 1 / 2 / 3（每个角色各不相同） |
| `B` | 背包 |
| `L` 或 `C` | 法宝合成 |
| `P` / `Esc` | 暂停 |
| `Enter` | 开始游戏 |

方向键与 `WASD` 等效。

## 改代码

需要先装 [Node.js](https://nodejs.org/) 18 或更高版本。游戏本身零依赖，不用 `npm install`。

```bash
git clone https://github.com/HBUTFAKER/-.git xiyou
cd xiyou

node server.js                 # 本地起服务，浏览器打开 http://localhost:8080
node build.js                  # 把 src/ 打包成单文件 西游降妖录.html
node --test tests/*.test.js    # 跑测试，47 项全过才算没改坏
```

**重要**：改完 `src/` 里任意文件后，必须重新执行 `node build.js`，否则 `西游降妖录.html` 还是旧的。想边改边看，直接双击 `index.html` 也行（它引用 `src/` 下的源文件，不走打包）。

## 目录结构

```
src/data.js       角色、技能、法宝、怪物、关卡配置（改数值先看这里）
src/logic.js      纯函数逻辑：伤害计算、掉落、合成（被测试直接覆盖）
src/engine.js     游戏主循环、物理、碰撞、角色动作状态机
src/art.js        程序化 2D 角色美术，所有人物都在这儿画
src/fx.js         特效层：刀光、火花、冲击环、巨棒、祥云
src/scenery.js    三关背景立绘与视差
src/ui.js         HUD、背包、合成、菜单
src/game.js       状态机与场景调度，串起上面所有模块
build.js          单文件打包脚本
server.js         本地预览用的小服务
tests/            Node 原生测试，覆盖核心逻辑与渲染安全
```

## 想加东西，从哪里下手

- **加角色**：`src/data.js` 的 `CHARACTERS` 加配置 → `src/art.js` 加一套配色和画法
- **加技能**：`src/data.js` 的 `SKILLS`，`kind` 支持 `melee` / `dash` / `aoe` / `projectile`，`anim` 决定演出
- **改数值**（伤害、血量、冷却）：只动 `src/data.js`，不用碰引擎
- **加怪物 / 关卡**：`src/data.js` 的 `ENEMIES` 与 `LEVELS`，背景在 `src/scenery.js`
- **调手感**：`src/engine.js` 顶部的重力、跳跃初速、奔跑倍率等常量

脚本加载顺序是 `data → logic → art → fx → scenery → engine → ui → game`，`index.html` 和 `build.js` 里各有一份，新增模块时两处都要加。

## 许可

随便玩、随便改。
