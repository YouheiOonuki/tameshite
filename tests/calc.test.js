// 計算ロジックのテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calc.js');
const CONSTANTS = require('../constants.js');

test('耳: 音量の上限は固定で小さい（ゲイン 0.05 以下、約 −30 dBFS）', () => {
  assert.ok(C.TONE_GAIN > 0 && C.TONE_GAIN <= C.TONE_MAX_GAIN && C.TONE_MAX_GAIN <= 0.05);
  assert.ok(20 * Math.log10(C.TONE_GAIN) <= -30);
  assert.ok(C.TONE_RAMP >= 0.05 && C.TONE_RAMP * 2 < C.TONE_SECONDS);
});

test('耳: ナイキスト周波数より下の音だけ鳴らす', () => {
  assert.deepEqual(C.playableFreqs(48000), C.TEST_FREQS);
  assert.deepEqual(C.playableFreqs(44100), C.TEST_FREQS);           // 22,050 Hz まで
  assert.deepEqual(C.playableFreqs(32000), [8000, 10000, 12000, 14000, 15000]);   // 16,000 Hz 以上は鳴らせない
  assert.deepEqual(C.playableFreqs(NaN), []);
});

test('耳: 進め方は低い順、無音の回は 1 回だけ（先頭には置かない）', () => {
  const p = C.mimiPlan(C.TEST_FREQS, 3);
  assert.equal(p.filter((x) => x.kind === 'silent').length, 1);
  assert.equal(p[3].kind, 'silent');
  assert.deepEqual(p.filter((x) => x.kind === 'tone').map((x) => x.freq), C.TEST_FREQS);
  assert.equal(C.mimiPlan(C.TEST_FREQS, 0)[1].kind, 'silent');
  assert.equal(C.mimiPlan(C.TEST_FREQS, 99)[C.TEST_FREQS.length - 1].kind, 'silent');
});

test('耳: 結果は「聞こえた」一番高い音、無音に「聞こえた」は注意', () => {
  const r = C.mimiResult([
    { kind: 'tone', freq: 8000, heard: true }, { kind: 'silent', heard: false }, { kind: 'tone', freq: 10000, heard: true },
    { kind: 'tone', freq: 12000, heard: false },
  ]);
  assert.deepEqual(r, { highest: 10000, falseAlarm: false, stoppedAt: 12000 });
  assert.deepEqual(C.mimiResult([{ kind: 'tone', freq: 8000, heard: false }]), { highest: null, falseAlarm: false, stoppedAt: 8000 });
  assert.equal(C.mimiResult([{ kind: 'silent', heard: true }]).falseAlarm, true);
});

test('反射: 待ち時間は 1.5〜4 秒、早すぎ・先読み・正常の判定', () => {
  assert.equal(C.hanshaWait(0), 1500);
  assert.equal(C.hanshaWait(0.999999), 4000);
  assert.deepEqual(C.hanshaJudge(null, 100), { kind: 'early' });
  assert.deepEqual(C.hanshaJudge(1000, 900), { kind: 'early' });
  assert.equal(C.hanshaJudge(1000, 1099.9).kind, 'anticipate');
  const ok = C.hanshaJudge(1000, 1250);
  assert.deepEqual(ok, { kind: 'ok', ms: 250 });
});

test('反射: 中央値・平均・最速', () => {
  assert.deepEqual(C.hanshaSummary([300, 250, 260, 900, 240]), { n: 5, mean: 390, median: 260, best: 240 });
  assert.equal(C.median([1, 2, 3, 4]), 2.5);
  assert.equal(C.hanshaSummary([]), null);
});

test('反射: 定規の換算 t = √(2d/g)、g = 9.80665 m/s²', () => {
  assert.equal(C.G, 9.80665);
  assert.equal(Math.round(C.rulerMs(5)), 101);
  assert.equal(Math.round(C.rulerMs(10)), 143);
  assert.equal(Math.round(C.rulerMs(20)), 202);
  assert.equal(Math.round(C.rulerMs(30)), 247);
  assert.equal(C.rulerMs(0), 0);
  assert.ok(Number.isNaN(C.rulerMs(-1)));
  assert.ok(Number.isNaN(C.rulerMs('')));
});

test('動体: 段は 14、だんだん速い。2 回まちがえたら終わり', () => {
  const L = C.DOUTAI_LEVELS;
  assert.equal(L.length, 14);
  assert.equal(L[0], 2.0);
  assert.equal(L[13], 0.15);
  for (let i = 1; i < L.length; i++) assert.ok(L[i] < L[i - 1]);
  let s = { level: 0, misses: 0, cleared: -1, done: false };
  s = C.doutaiNext(s, true); assert.deepEqual(s, { level: 1, misses: 0, cleared: 0, done: false });
  s = C.doutaiNext(s, false); assert.deepEqual(s, { level: 1, misses: 1, cleared: 0, done: false });
  s = C.doutaiNext(s, true); assert.deepEqual(s, { level: 2, misses: 1, cleared: 1, done: false });
  s = C.doutaiNext(s, false); assert.equal(s.done, true); assert.equal(s.cleared, 1);
  let t = { level: 13, misses: 0, cleared: 12, done: false };
  t = C.doutaiNext(t, true); assert.equal(t.done, true); assert.equal(t.cleared, 13);
});

test('記憶: 数字の列（同じ数字が続かない）、答え合わせ、進み方', () => {
  let i = 0; const seq = [0.1, 0.15, 0.5, 0.99, 0.0];
  const d = C.kiokuDigits(4, () => seq[i++ % seq.length]);
  assert.deepEqual(d, [1, 5, 9, 0]);   // 0.15 → 1 は直前と同じなので飛ばす
  assert.equal(C.kiokuCheck([1, 5, 9], '159', false), true);
  assert.equal(C.kiokuCheck([1, 5, 9], '951', true), true);
  assert.equal(C.kiokuCheck([1, 5, 9], '951', false), false);
  let s = { len: 3, tries: 0, best: 0, done: false };
  s = C.kiokuNext(s, true); assert.deepEqual(s, { len: 4, tries: 0, best: 3, done: false });
  s = C.kiokuNext(s, false); assert.deepEqual(s, { len: 4, tries: 1, best: 3, done: false });
  s = C.kiokuNext(s, false); assert.equal(s.done, true); assert.equal(s.best, 3);
  let m = { len: 12, tries: 0, best: 11, done: false };
  m = C.kiokuNext(m, true); assert.equal(m.done, true); assert.equal(m.best, 12);
});

test('老眼: カードの大きさ（ID-1 85.60 × 53.98 mm）から 1 mm あたりの px', () => {
  assert.equal(C.CARD_W_MM, 85.6);
  assert.equal(C.CARD_H_MM, 53.98);
  assert.ok(Math.abs(C.pxPerMmFromCard(53.98 * 6) - 6) < 1e-9);
  assert.ok(Math.abs(C.pxPerMmFromCard(85.6 * 4, C.CARD_W_MM) - 4) < 1e-9);
  assert.ok(Number.isNaN(C.pxPerMmFromCard(10)));
  assert.ok(Math.abs(C.CSS_PX_PER_MM - 3.7795) < 1e-4);   // 96px = 25.4mm
  assert.equal(C.normScale(5.5), 5.5);
  assert.equal(C.normScale(50), null);
});

test('老眼: mm → ポイント、距離の入力', () => {
  assert.ok(Math.abs(C.mmToPt(25.4) - 72) < 1e-9);
  assert.equal(C.mmToPt(2).toFixed(1), '5.7');
  assert.equal(C.normNearCm('25'), 25);
  assert.equal(C.normNearCm('33.33'), 33.3);
  assert.equal(C.normNearCm('4'), null);
  assert.equal(C.normNearCm(''), null);
  assert.equal(C.normNearCm('abc'), null);
});

test('記録の正規化: 形の違うもの・範囲外は捨て、最新 30 件まで', () => {
  const at = '2026-09-25T01:02:03.000Z';
  const r = C.normRecords({
    mimi: [{ at, highest: 16000 }, { at, highest: 123 }, { at: 'x', highest: 8000 }, { at, highest: null, falseAlarm: 'yes' }],
    hansha: [{ at, median: 250, mean: 260, best: 230, input: 'mouse' }, { at, median: -1, mean: 1, best: 1 }],
    doutai: [{ at, cleared: 3 }, { at, cleared: 99 }, { at, cleared: 1.5 }],
    kioku: [{ at, best: 7, reverse: true }, { at, best: 13 }],
    roogan: [{ at, nearCm: 30 }, { at, sizeMm: 2, distCm: 30 }, { at, sizeMm: 7 }, { at, redGreen: 'blue' }, { at, redGreen: 'red' }],
    extra: 1,
  });
  assert.deepEqual(r.mimi, [{ at, highest: 16000, falseAlarm: false }, { at, highest: null, falseAlarm: false }]);
  assert.deepEqual(r.hansha, [{ at, median: 250, mean: 260, best: 230, input: 'mouse' }]);
  assert.deepEqual(r.doutai, [{ at, cleared: 3 }]);
  assert.deepEqual(r.kioku, [{ at, best: 7, reverse: true }]);
  assert.deepEqual(r.roogan, [
    { at, nearCm: 30, sizeMm: null, distCm: null, redGreen: null },
    { at, nearCm: null, sizeMm: 2, distCm: 30, redGreen: null },
    { at, nearCm: null, sizeMm: null, distCm: null, redGreen: 'red' },
  ]);
  assert.equal(r.extra, undefined);
  const many = C.normRecords({ kioku: Array.from({ length: 40 }, (_, i) => ({ at, best: i % 12 })) });
  assert.equal(many.kioku.length, 30);
  assert.deepEqual(C.normRecords(null), { mimi: [], hansha: [], doutai: [], kioku: [], roogan: [] });
});

test('constants: すべての出典に label・url・確認日（CHECKED と同じ）がある', () => {
  assert.match(CONSTANTS.CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  for (const [key, c] of Object.entries(CONSTANTS.SOURCES)) {
    assert.ok(c.label && c.fact && /^https:\/\//.test(c.url), key);
    assert.equal(c.checked, CONSTANTS.CHECKED, key);
  }
});
