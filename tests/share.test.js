// 共有される結果（yorozu-plans K124・企画書 60、ACCEPTANCE 3 章「束 B」）
// 結果の URL（# 以降）の作り・読み、着地ページと OG 画像（種類ごとに 12 枚以内）、結果カードの部品（外向きの要求なし・演出 1 つ・reduced-motion）
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Calc = require('../calc.js');
const ShareCard = require('../share-card.js');

const ROOT = path.join(__dirname, '..');
const read = (r) => fs.readFileSync(path.join(ROOT, r), 'utf8');
const AT = Date.parse('2026-10-02T12:04:00Z');
const T3 = ['hansha', 'kioku', 'mimi'];

function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('hex', 0, 8), '89504e470d0a1a0a', file + ' は PNG ではない');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('反射: 結果 → # → 同じ結果。種類は中央値の 50 ms の帯', () => {
  const r = { median: 231, mean: 240, best: 198, input: 'mouse' };
  const h = Calc.shareEncode('hansha', r, AT);
  assert.equal(h, '#m=231&a=240&b=198&i=m&t=1790942640');
  assert.deepEqual(Calc.shareDecode('hansha', h), Object.assign({}, r, { atMs: AT }));
  assert.equal(Calc.shareKind('hansha', r), '200');
  assert.equal(Calc.shareKind('hansha', { median: 120 }), '100');
  assert.equal(Calc.shareKind('hansha', { median: 150 }), '150');
  assert.equal(Calc.shareKind('hansha', { median: 399 }), '350');
  assert.equal(Calc.shareKind('hansha', { median: 900 }), '400');
});

test('記憶・耳: 結果 → # → 同じ結果', () => {
  const k = { best: 7, reverse: true };
  assert.equal(Calc.shareEncode('kioku', k, AT), '#k=7&o=r&t=1790942640');
  assert.deepEqual(Calc.shareDecode('kioku', Calc.shareEncode('kioku', k, AT)), Object.assign({}, k, { atMs: AT }));
  assert.deepEqual(Calc.shareDecode('kioku', '#k=0&o=f'), { best: 0, reverse: false, atMs: null });
  const m = { highest: 16000, falseAlarm: true };
  assert.equal(Calc.shareEncode('mimi', m, AT), '#hz=16000&f=1&t=1790942640');
  assert.deepEqual(Calc.shareDecode('mimi', Calc.shareEncode('mimi', m, AT)), Object.assign({}, m, { atMs: AT }));
  assert.deepEqual(Calc.shareDecode('mimi', '#hz=0'), { highest: null, falseAlarm: false, atMs: null });
  assert.equal(Calc.shareKind('mimi', { highest: null }), '0');
});

test('範囲の外・形の違う # は読まない（null）', () => {
  for (const h of ['', '#', '#m=50&a=60&b=40', '#m=231&a=240&b=300', '#m=abc&a=1&b=1', '#m=231&a=240']) assert.equal(Calc.shareDecode('hansha', h), null, h);
  for (const h of ['#k=2&o=f', '#k=13&o=f', '#k=7', '#k=7&o=x']) assert.equal(Calc.shareDecode('kioku', h), null, h);
  for (const h of ['#hz=9000', '#hz=-1', '#hz=30000']) assert.equal(Calc.shareDecode('mimi', h), null, h);
  // 日時が範囲の外なら日時だけ捨てる
  assert.equal(Calc.shareDecode('kioku', '#k=5&o=f&t=99').atMs, null);
});

test('URL に入るのは数字と記号だけ（名前・記録の一覧・端末の情報は入らない）', () => {
  const hs = [Calc.shareEncode('hansha', { median: 231, mean: 240, best: 198, input: 'touch' }, AT),
    Calc.shareEncode('kioku', { best: 12, reverse: false }, AT), Calc.shareEncode('mimi', { highest: null, falseAlarm: false }, AT)];
  for (const h of hs) assert.match(h, /^#(?:[a-z]{1,2}=[0-9a-z]{1,12})(?:&[a-z]{1,2}=[0-9a-z]{1,12})*$/, h);
  for (const t of T3) assert.doesNotMatch(read('common.js') + read(t + '/' + t + '.js'), /navigator\.userAgent|getUserMedia/);
});

test('着地ページと OG 画像: 種類ごとに 1 枚（12 枚以内）、1200×630、noindex・広告スクリプトなし・すぐ道具へ', () => {
  for (const t of T3) {
    const kinds = Calc.shareKinds(t);
    assert.ok(kinds.length >= 1 && kinds.length <= 12, t + ' の種類が ' + kinds.length);
    const files = fs.readdirSync(path.join(ROOT, t, 's')).sort();
    assert.deepEqual(files, kinds.flatMap((k) => [k + '.html', k + '.png']).sort(), t + ' の s/ に余分・不足');
    for (const k of kinds) {
      assert.deepEqual(pngSize(path.join(ROOT, t, 's', k + '.png')), [1200, 630], t + '/' + k);
      const s = read(t + '/s/' + k + '.html');
      assert.match(s, /<meta name="robots" content="noindex">/);
      assert.ok(s.includes(`<meta property="og:image" content="https://yorozu-craft.com/tameshite/${t}/s/${k}.png">`), t + '/' + k);
      assert.ok(s.includes(`<meta property="og:url" content="https://yorozu-craft.com/tameshite/${t}/s/${k}.html">`), t + '/' + k);
      assert.ok(s.includes('<script>location.replace("../" + location.hash);</script>'));
      assert.doesNotMatch(s, /adsbygoogle|pagead2/);
      assert.equal((s.match(/name="google-adsense-account"/g) || []).length, 1);
      assert.equal((s.match(/beacon\.min\.js/g) || []).length, 1);
      assert.doesNotMatch(s, /診断|改善|予防|効果|治る|若返/);
    }
    // カードの URL は種類の着地ページを指す
    assert.ok(Calc.shareKinds(t).includes(Calc.shareKind(t, Calc.shareDecode(t, { hansha: '#m=231&a=240&b=198&i=t', kioku: '#k=7&o=f', mimi: '#hz=16000' }[t]))));
  }
  execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-share.mjs'), '--check']);
});

test('結果カードの部品: 外向きの要求なし・SNS の SDK なし・演出は 1 つで reduced-motion で止まる', () => {
  const s = read('share-card.js');
  assert.doesNotMatch(s, /https?:\/\//, '外の URL が無い');
  assert.doesNotMatch(s, /\bfetch\(|XMLHttpRequest|sendBeacon|<script|\.src\s*=/);
  assert.equal((s.match(/@keyframes/g) || []).length, 1);
  assert.match(s, /@media \(prefers-reduced-motion:reduce\)\{\.share-card\{animation:none\}\}/);
  assert.equal(ShareCard.fmtWhen(AT, 'Asia/Tokyo'), '2026年10月2日 21:04');
  assert.equal(ShareCard.link('https://x/s/1.html', 'k=1'), 'https://x/s/1.html#k=1');
  for (const t of T3) {
    const h = read(t + '/index.html');
    assert.ok(h.includes('<script src="../share-card.js"></script>'), t);
    // カードは結果の欄の中（体を測る道具の注意より後ろ）
    assert.ok(h.indexOf('id="result-card"') < h.indexOf('id="share-host"'), t);
  }
});
