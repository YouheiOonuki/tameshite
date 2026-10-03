// 睡眠の計算（Sleep calculator、英語ページ。K68）のテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../sleep.js');
const V = require('../sleep-values.js');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('手で確かめた例: 7:00 に起きる・90 分・寝つくまで 15 分 → 9:45 PM（6 周期）・11:15 PM（5 周期）・12:45 AM（4 周期）', () => {
  const r = S.calc({ mode: 'wake', time: '07:00' });
  assert.deepEqual(r.options.map((o) => o.label), ['9:45 PM', '11:15 PM', '12:45 AM']);
  assert.deepEqual(r.options.map((o) => o.sleepMin), [540, 450, 360]);
  assert.equal(r.best, 1);   // 大人 7〜9 時間に入る最短 = 7.5 時間
});

test('寝る時刻から: 23:30 に寝る・100 分・0 分 → 9:30 AM・7:50 AM・6:10 AM', () => {
  const r = S.calc({ mode: 'bed', time: '23:30', cycle: 100, latency: 0 });
  assert.deepEqual(r.options.map((o) => o.label), ['9:30 AM', '7:50 AM', '6:10 AM']);
});

test('日付をまたぐ・12 時の表記・入力の正規化', () => {
  assert.equal(S.fmt12(0), '12:00 AM');
  assert.equal(S.fmt12(720), '12:00 PM');
  assert.equal(S.fmt12(-15), '11:45 PM');
  assert.equal(S.calc({ mode: 'wake', time: '00:30', latency: 0 }).options[2].label, '6:30 PM');
  const d = S.normalizeInput({ cycle: 300, latency: -5, time: '25:00', age: 'x' });
  assert.deepEqual(d, { mode: 'wake', time: '07:00', cycle: V.cycle.def, latency: V.latencyDefault, age: 'adult' });
  assert.equal(S.normalizeInput({ latency: 0 }).latency, 0);
  assert.equal(S.normalizeInput({ latency: 999 }).latency, V.latencyMax);
});

test('推奨の幅に入らないとき（3〜5 歳: 10〜13 時間）は最も長い案を出す', () => {
  const r = S.calc({ time: '07:00', age: 'pre' });
  assert.ok(r.options.every((o) => !o.inRange));
  assert.equal(r.best, 0);
});

test('出典の値（NHLBI）: 周期 80〜100 分・1 晩 4〜6 周期・大人 7〜9 時間', () => {
  assert.match(V.SOURCES.stages.fact, /every 80 to 100 minutes/);
  assert.equal(V.cycle.min, 80); assert.equal(V.cycle.max, 100);
  assert.match(V.SOURCES.stages.fact, /four to six cycles/);
  assert.deepEqual([Math.min(...V.cycles), Math.max(...V.cycles)], [4, 6]);
  assert.match(V.SOURCES.enough.fact, /between 7 and 9 hours/);
  assert.deepEqual(V.ages.find((a) => a.id === 'adult'), { id: 'adult', label: 'Adults', min: 7, max: 9 });
});

test('使い方ページの控えの数字が計算と同じ。保存しない（localStorage を使わない）。医療をうたう語が無い', () => {
  const g = read('en/sleep-calculator/guide.html');
  const ex = S.calc({ mode: 'wake', time: '07:00', cycle: 90, latency: 15 }).options;
  assert.ok(g.includes('data-v="ex6">' + ex[0].label + '<') && g.includes('data-v="ex5">' + ex[1].label + '<'));
  assert.ok(g.includes(ex[0].label + ' for 6 cycles (9 hours) or ' + ex[1].label + ' for 5 cycles'));
  for (const f of ['en/sleep-calculator/app.js', 'sleep.js']) assert.ok(!/localStorage/.test(read(f)), f);
  const all = read('en/sleep-calculator/index.html') + g;
  for (const w of [/\bcure\b/i, /\btreat(ment)?\b/i, /\bdiagnos/i, /\bimprove/i, /\bprevent/i, /\bguarantee/i]) assert.ok(!w.test(all), String(w));
  assert.ok(all.indexOf('not medical advice') < read('en/sleep-calculator/index.html').indexOf('id="result-card"'));
});
