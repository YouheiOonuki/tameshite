// 全ページの決まりのテスト: 広告（遊ぶ画面は meta だけ、老眼チェックは広告なし: D118）、
// 体を測る道具の注意（WRITING 2 章）を本文の最初に固定、ビーコン、共通ページへのリンク、sitemap・canonical、Service Worker
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
function htmlFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'tests') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...htmlFiles(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const FILES = htmlFiles(ROOT);
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const read = (r) => fs.readFileSync(path.join(ROOT, r), 'utf8');
const CAUTION = 'これは遊びの目安で、医療の検査ではありません。気になるときは眼科・耳鼻科へ。';
const NOAD = 'このページは広告なし・登録なし・入力は端末の外に出ません。';
const TESTS = ['mimi', 'hansha', 'doutai', 'kioku', 'roogan'];
// 広告の扱い: meta だけ（遊ぶ画面・老眼チェック）／スクリプトあり（ハブ・耳と K95 の使い方）
const META_ONLY = ['mimi/index.html', 'hansha/index.html', 'doutai/index.html', 'kioku/index.html', 'roogan/index.html', 'roogan/guide.html'];
const WITH_ADS = ['index.html', 'mimi/guide.html', 'hansha/guide.html', 'doutai/guide.html', 'kioku/guide.html'];
const AD_SCRIPT = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g;

function mainParas(s) {
  const main = s.slice(s.indexOf('<main'));
  return [...main.matchAll(/<(p|h2|section|div|ul|ol|fieldset|article)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2].trim());
}

test('ページが揃っている（ハブ・5 つのテストと使い方・404）', () => {
  const names = FILES.map(rel).sort();
  assert.deepEqual(names, ['404.html', 'index.html', ...TESTS.flatMap((t) => [t + '/guide.html', t + '/index.html'])].sort());
});

test('広告: 遊ぶ画面と老眼チェック（D118）は meta だけ、ハブと K94・K95 の使い方はスクリプト 1 個', () => {
  for (const r of META_ONLY) {
    const s = read(r);
    assert.doesNotMatch(s, /pagead2|adsbygoogle|googletagservices|doubleclick/i, r + ' に広告のスクリプトがある');
    assert.equal((s.match(/<meta name="google-adsense-account" content="ca-pub-5375267956079717">/g) || []).length, 1, r);
  }
  for (const r of WITH_ADS) {
    const s = read(r);
    assert.equal((s.match(AD_SCRIPT) || []).length, 1, r);
    assert.equal((s.match(/<meta name="google-adsense-account" content="ca-pub-5375267956079717">/g) || []).length, 1, r);
  }
  // JS から広告を差し込まない
  for (const f of ['calc.js', 'common.js', 'constants.js', ...TESTS.map((t) => t + '/' + t + '.js')]) {
    assert.doesNotMatch(read(f), /pagead2|adsbygoogle/i, f);
  }
});

test('空の広告枠・手動の広告枠は置かない', () => {
  for (const f of FILES) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /<ins class="adsbygoogle"/, rel(f));
});

test('体を測る道具の注意（WRITING 2 章の定型文）が本文の最初に固定（老眼チェックは広告なしの定型文の次）', () => {
  for (const t of TESTS) {
    for (const r of [t + '/index.html', t + '/guide.html']) {
      const ps = mainParas(read(r));
      if (t === 'roogan') {
        assert.equal(ps[0], NOAD, r + ' の最初が広告なしの定型文ではない');
        assert.equal(ps[1], CAUTION, r + ' の 2 番目が注意ではない');
      } else if (r.endsWith('index.html')) {
        assert.equal(ps[0], CAUTION, r + ' の最初が注意ではない');
      }
    }
    // 結果より前にある
    const s = read(t + '/index.html');
    assert.ok(s.indexOf(CAUTION) < s.indexOf('id="result-card"'), t);
  }
  assert.equal(mainParas(read('index.html'))[0], CAUTION);
  // 使い方ページ（K94・K95）は注意の節に同じ文
  for (const t of ['mimi', 'hansha', 'doutai', 'kioku']) assert.ok(read(t + '/guide.html').includes(CAUTION), t);
});

test('広告なしの定型文は、広告スクリプトの無い老眼チェックだけに書く', () => {
  for (const f of FILES) {
    const r = rel(f);
    const has = fs.readFileSync(f, 'utf8').includes(NOAD);
    assert.equal(has, r.startsWith('roogan/'), r);
  }
});

test('Cloudflare のビーコンは各ページに 1 個', () => {
  for (const f of FILES) {
    const n = (fs.readFileSync(f, 'utf8').match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) || []).length;
    assert.equal(n, 1, rel(f));
  }
});

test('共通ページ（運営者情報・プライバシーポリシー）へ相対パスでリンク', () => {
  for (const f of FILES) {
    const r = rel(f);
    if (r === '404.html') continue;
    const s = fs.readFileSync(f, 'utf8');
    const up = '../'.repeat(r.split('/').length);
    assert.ok(s.includes('href="' + up + 'about.html"'), r + ' about');
    assert.ok(s.includes('href="' + up + 'privacy-policy.html"'), r + ' privacy');
  }
});

test('sitemap と canonical が一致、使い方ページへのリンクがある', () => {
  const sm = read('sitemap.xml');
  for (const f of FILES) {
    const r = rel(f);
    if (r === '404.html') continue;
    const url = 'https://yorozu-craft.com/tameshite/' + r.replace(/index\.html$/, '');
    assert.ok(sm.includes('<loc>' + url + '</loc>'), url + ' が sitemap に無い');
    assert.ok(fs.readFileSync(f, 'utf8').includes('<link rel="canonical" href="' + url + '">'), r + ' の canonical');
  }
  for (const t of TESTS) assert.ok(read(t + '/index.html').includes('href="./guide.html"'), t);
});

test('使い方ページは文章の上限の目安（h2 6 まで・FAQ 3 まで）', () => {
  for (const t of TESTS) {
    const s = read(t + '/guide.html');
    assert.ok((s.match(/<h2\b/g) || []).length <= 6, t + ' h2');
    const faq = s.slice(s.indexOf('<dl class="faq">'), s.indexOf('</dl>', s.indexOf('<dl class="faq">')));
    assert.ok((faq.match(/<dt>/g) || []).length <= 3, t + ' FAQ');
    const ld = JSON.parse(s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld['@type'], 'FAQPage');
    assert.equal(ld.mainEntity.length, (faq.match(/<dt>/g) || []).length, t + ' FAQ と JSON-LD の数');
  }
});

test('保存キーは tameshite_ で始まる（README 12）', () => {
  const src = read('common.js');
  assert.match(src, /var PREFIX = 'tameshite_';/);
  for (const t of TESTS) assert.doesNotMatch(read(t + '/' + t + '.js'), /localStorage/, t + ' は common.js の store を使う');
});

test('耳: Web Audio の音量はゲインの上限（TONE_GAIN）だけを使い、ほかの値で音量を上げない', () => {
  const s = read('mimi/mimi.js');
  assert.match(s, /linearRampToValueAtTime\(Calc\.TONE_GAIN/);
  assert.doesNotMatch(s, /gain\.value\s*=/);
  assert.doesNotMatch(s, /getUserMedia/);   // マイクは使わない
});

test('Service Worker: キャッシュ名は tameshite-v2、先読みするファイルはすべてある、manifest の id は /tameshite/', () => {
  const sw = read('sw.js');
  assert.match(sw, /const CACHE_PREFIX = 'tameshite-';/);
  assert.match(sw, /const CACHE_NAME {3}= `\$\{CACHE_PREFIX\}v2`;/);
  const list = sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/)[1].match(/'\.\/[^']*'/g).map((x) => x.slice(3, -1));
  for (const u of list) {
    const p = path.join(ROOT, u === '' || u.endsWith('/') ? u + 'index.html' : u);
    assert.ok(fs.existsSync(p), u + ' が無い');
  }
  for (const t of TESTS) assert.ok(list.includes(t + '/') && list.includes(t + '/' + t + '.js'), t);
  const mf = JSON.parse(read('manifest.webmanifest'));
  assert.equal(mf.id, '/tameshite/');
});
