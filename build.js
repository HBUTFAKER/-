// 打包成单文件 HTML：把 src/*.js 全部内联进 index.html，产出可直接双击的独立文件。
// 用途：微信/预览面板/受限 file:// 环境下，避免外部脚本加载失败导致白屏。
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ordered = ['data', 'logic', 'audio', 'art', 'portraits', 'fx', 'scenery', 'engine', 'ui', 'game'];

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 立绘内联：转 base64 注入，单文件不需要 assets/ 目录也能显示
const PORTRAIT_IDS = ['wukong', 'bajie', 'tangseng', 'shaseng', 'bailongma'];
{
  const map = {};
  for (const id of PORTRAIT_IDS) {
    const jpg = path.join(ROOT, 'assets', 'portraits', id + '.jpg');
    map[id] = 'data:image/jpeg;base64,' + fs.readFileSync(jpg).toString('base64');
  }
  const tag = '<script src="src/portraits.js"></script>';
  if (!html.includes(tag)) throw new Error('index.html 里找不到脚本标签: ' + tag);
  html = html.replace(tag, '<script>window.__XY_PORTRAITS__=' + JSON.stringify(map) + ';</script>\n' + tag);
}

for (const name of ordered) {
  const code = fs.readFileSync(path.join(ROOT, 'src', name + '.js'), 'utf8');
  const tag = '<script src="src/' + name + '.js"></script>';
  if (!html.includes(tag)) throw new Error('index.html 里找不到脚本标签: ' + tag);
  if (code.includes('</script')) throw new Error(name + '.js 含 </script，不能直接内联');
  html = html.replace(tag, '<script>\n/* ===== ' + name + '.js ===== */\n' + code + '\n</script>');
}

const out = path.join(ROOT, '西游降妖录.html');
fs.writeFileSync(out, html, 'utf8');
console.log('已生成单文件: ' + out + '  (' + Math.round(html.length / 1024) + ' KB)');
