// ===========================
// ためして（耳・反射・目） — 計算ロジック（画面から切り離した純粋関数）
// DOM・Web Audio・localStorage に触らない。tests/calc.test.js から node --test で確かめる
// ブラウザでは window.Calc、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  function num(v) { var n = Number(v); return v !== null && v !== '' && isFinite(n) ? n : NaN; }
  function round(v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

  // --- 集計（反射神経の 5 回など） ---
  function mean(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : NaN; }
  function median(a) {
    if (!a.length) return NaN;
    var s = a.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // ===== 耳（モスキート音） =====
  // 音量の上限（Web Audio のゲイン。1 がフルスケール）。これより大きくする操作は画面に無い（音量の調整は下げる方向だけ）。
  // 0.03 はフルスケールより約 30 dB 小さい（20·log10(0.03) ≒ −30.5 dBFS）。耳に届く大きさは端末の音量とイヤホンで決まるので、
  // 画面では鳴らす前に「端末の音量を小さく」「聞こえなくても上げない」と書く
  var TONE_GAIN = 0.03;
  var TONE_MAX_GAIN = 0.05;          // テストで TONE_GAIN がこれを超えないことを確かめる
  var TONE_SECONDS = 1.2;            // 1 回に鳴らす長さ（立ち上がり・消え際を含む）
  var TONE_RAMP = 0.1;               // 立ち上がりと消え際（秒）。急に鳴らすと「プツッ」という広い帯域の音が出て、高い音が出ていなくても聞こえてしまう
  var CHECK_FREQ = 1000;             // 最初に端末の音量を合わせる確認の音
  var TEST_FREQS = [8000, 10000, 12000, 14000, 15000, 16000, 17000, 18000, 19000, 20000];

  /** 鳴らせる周波数だけを残す（ナイキスト周波数＝サンプリング周波数の半分より下。W3C Web Audio API） */
  function playableFreqs(sampleRate, freqs) {
    var ny = num(sampleRate) / 2;
    return (freqs || TEST_FREQS).filter(function (f) { return isFinite(ny) && f < ny; });
  }

  /**
   * 耳のテストの進め方: 低い音から 1 つずつ上げ、「聞こえない」と答えたら終わり。途中に 1 回だけ無音の回を混ぜる
   * @param {number[]} freqs 鳴らす周波数（低い順）
   * @param {number} silentAt 無音の回を何番目（0 始まり）の音の前に入れるか（1〜freqs.length-1 に丸める）
   * @returns {{kind:'tone'|'silent', freq?:number}[]} 出す順番
   */
  function mimiPlan(freqs, silentAt) {
    var out = [];
    var at = Math.max(1, Math.min(freqs.length - 1, Math.floor(num(silentAt)) || 1));
    freqs.forEach(function (f, i) {
      if (i === at) out.push({ kind: 'silent' });
      out.push({ kind: 'tone', freq: f });
    });
    return out;
  }

  /**
   * 答えから結果を出す
   * @param {{kind:string, freq?:number, heard:boolean}[]} answers 出した順の答え（途中で終わってよい）
   * @returns {{highest:number|null, falseAlarm:boolean, stoppedAt:number|null}}
   *   highest: 「聞こえた」と答えた一番高い周波数（無ければ null）。falseAlarm: 無音の回に「聞こえた」。stoppedAt: 最初に「聞こえない」と答えた周波数
   */
  function mimiResult(answers) {
    var highest = null, falseAlarm = false, stoppedAt = null;
    answers.forEach(function (a) {
      if (a.kind === 'silent') { if (a.heard) falseAlarm = true; return; }
      if (a.heard) { if (highest === null || a.freq > highest) highest = a.freq; } else if (stoppedAt === null) stoppedAt = a.freq;
    });
    return { highest: highest, falseAlarm: falseAlarm, stoppedAt: stoppedAt };
  }

  // ===== 反射神経 =====
  var HANSHA_TRIALS = 5;
  var HANSHA_WAIT_MIN = 1500, HANSHA_WAIT_MAX = 4000;   // 合図までの待ち（ミリ秒）。毎回ランダム
  var HANSHA_TOO_FAST = 100;   // これより速い反応は、合図を見てからではなく先読みとみなしてやり直す（画面の説明と同じ値）

  /** 合図までの待ち時間（r は 0 以上 1 未満の乱数） */
  function hanshaWait(r) { return Math.round(HANSHA_WAIT_MIN + (HANSHA_WAIT_MAX - HANSHA_WAIT_MIN) * r); }

  /** 1 回分の判定: 合図の前 → early、100ms 未満 → anticipate、それ以外は ok と ms */
  function hanshaJudge(signalAt, pressedAt) {
    if (signalAt === null || signalAt === undefined || pressedAt < signalAt) return { kind: 'early' };
    var ms = pressedAt - signalAt;
    if (ms < HANSHA_TOO_FAST) return { kind: 'anticipate', ms: ms };
    return { kind: 'ok', ms: ms };
  }

  function hanshaSummary(times) {
    if (!times.length) return null;
    return { n: times.length, mean: Math.round(mean(times)), median: Math.round(median(times)), best: Math.round(Math.min.apply(null, times)) };
  }

  /**
   * 定規の落下距離（cm）から、つかむまでの時間（ms）。自由落下 d = ½gt²（空気の抵抗は無視）
   * g は標準重力加速度 980.665 cm/s²（第 3 回国際度量衡総会 1901 年 宣言 2）
   */
  var G = 9.80665;
  function rulerMs(cm) {
    var d = num(cm);
    if (!(d >= 0)) return NaN;
    return Math.sqrt(2 * (d / 100) / G) * 1000;
  }

  // ===== 動体視力 =====
  // 数字が画面（遊ぶ枠）の端から端まで横切る時間（秒）。段が上がるほど速い
  var DOUTAI_LEVELS = [2.0, 1.6, 1.3, 1.05, 0.85, 0.7, 0.58, 0.48, 0.4, 0.33, 0.27, 0.22, 0.18, 0.15];
  var DOUTAI_LIVES = 2;   // 2 回まちがえたら終わり

  /** 1 問答えたあとの状態。state = { level: 0 始まり, misses, cleared: 正解した一番上の段（-1 は無し）, done } */
  function doutaiNext(state, correct) {
    var s = { level: state.level, misses: state.misses, cleared: state.cleared, done: false };
    if (correct) {
      s.cleared = Math.max(s.cleared, s.level);
      if (s.level >= DOUTAI_LEVELS.length - 1) s.done = true; else s.level += 1;
    } else {
      s.misses += 1;
      if (s.misses >= DOUTAI_LIVES) s.done = true;
    }
    return s;
  }

  // ===== 記憶力（数字の順番） =====
  var KIOKU_START = 3, KIOKU_MAX = 12, KIOKU_TRIES = 2;

  /** 数字の列を作る（rand は 0 以上 1 未満を返す関数）。同じ数字が続かないようにする */
  function kiokuDigits(len, rand) {
    var out = [];
    var guard = 0;
    while (out.length < len && guard++ < 10000) {
      var d = Math.min(9, Math.floor(rand() * 10));
      if (out.length && out[out.length - 1] === d) continue;
      out.push(d);
    }
    return out;
  }

  /** 答え合わせ（reverse なら逆から答える） */
  function kiokuCheck(digits, answer, reverse) {
    var want = reverse ? digits.slice().reverse() : digits;
    var got = String(answer).replace(/[^0-9]/g, '');
    return got === want.join('');
  }

  /** 1 問答えたあとの状態。state = { len, tries: その長さでまちがえた数, best: 正解した一番長い長さ（0 は無し）, done } */
  function kiokuNext(state, correct) {
    var s = { len: state.len, tries: state.tries, best: state.best, done: false };
    if (correct) {
      s.best = Math.max(s.best, s.len);
      s.tries = 0;
      if (s.len >= KIOKU_MAX) s.done = true; else s.len += 1;
    } else {
      s.tries += 1;
      if (s.tries >= KIOKU_TRIES) s.done = true;
    }
    return s;
  }

  // ===== 老眼チェック（画面の実寸） =====
  // クレジットカード・キャッシュカードなどの ID-1 の大きさ（ISO/IEC 7810。85.60 × 53.98 mm）
  var CARD_W_MM = 85.60, CARD_H_MM = 53.98;
  // CSS の 1in = 96px = 2.54cm（W3C CSS Values and Units）。合わせる前はこの値で出す（実際の画面とはずれる）
  var CSS_PX_PER_MM = 96 / 25.4;
  var SCALE_MIN = 2, SCALE_MAX = 12;   // 1 mm あたりの CSS px として受け付ける範囲

  /**
   * 画面上のカードの辺の長さ（CSS px）から 1 mm あたりの CSS px（範囲外は NaN）
   * スマホの縦画面はカードの長い辺（85.60 mm）より幅が狭いことが多いので、画面では短い辺（53.98 mm）を横にして合わせる
   */
  function pxPerMmFromCard(sidePx, sideMm) {
    var v = num(sidePx) / (sideMm || CARD_H_MM);
    return v >= SCALE_MIN && v <= SCALE_MAX ? v : NaN;
  }
  function normScale(v) { var n = num(v); return n >= SCALE_MIN && n <= SCALE_MAX ? n : null; }

  /** mm → ポイント（1pt = 1/72in、1in = 2.54cm。W3C CSS Values and Units） */
  function mmToPt(mm) { return num(mm) * 72 / 25.4; }

  // 字の大きさの行（字の枠の高さ mm。大きい順）
  var ROOGAN_SIZES = [5, 4, 3, 2.5, 2, 1.6, 1.3, 1];

  /** 距離の入力（cm）を確かめる。5〜200 cm だけを受け付ける（小数 1 桁に丸める） */
  function normNearCm(v) {
    var n = num(v);
    if (!(n >= 5 && n <= 200)) return null;
    return round(n, 1);
  }

  // --- 記録（ブラウザに保存する形）をそろえる。読み込んだファイルもここを通す ---
  var REC_MAX = 30;
  function isoDate(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 30) : null; }
  function normList(list, fn) {
    if (!Array.isArray(list)) return [];
    return list.map(function (r) { return r && typeof r === 'object' ? fn(r) : null; }).filter(Boolean).slice(-REC_MAX);
  }
  function normRecords(d) {
    d = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    return {
      mimi: normList(d.mimi, function (r) {
        var at = isoDate(r.at);
        if (!at) return null;
        var h = r.highest === null ? null : num(r.highest);
        if (h !== null && TEST_FREQS.indexOf(h) < 0) return null;
        return { at: at, highest: h, falseAlarm: r.falseAlarm === true };
      }),
      hansha: normList(d.hansha, function (r) {
        var at = isoDate(r.at);
        var m = num(r.median), a = num(r.mean), b = num(r.best);
        if (!at || !(m > 0 && m < 5000) || !(a > 0 && a < 5000) || !(b > 0 && b < 5000)) return null;
        return { at: at, median: Math.round(m), mean: Math.round(a), best: Math.round(b), input: ['key', 'mouse', 'touch', 'pen'].indexOf(r.input) >= 0 ? r.input : 'touch' };
      }),
      doutai: normList(d.doutai, function (r) {
        var at = isoDate(r.at);
        var c = num(r.cleared);
        if (!at || !(Math.floor(c) === c && c >= -1 && c < DOUTAI_LEVELS.length)) return null;
        return { at: at, cleared: c };
      }),
      kioku: normList(d.kioku, function (r) {
        var at = isoDate(r.at);
        var b = num(r.best);
        if (!at || !(Math.floor(b) === b && b >= 0 && b <= KIOKU_MAX)) return null;
        return { at: at, best: b, reverse: r.reverse === true };
      }),
      roogan: normList(d.roogan, function (r) {
        var at = isoDate(r.at);
        if (!at) return null;
        var near = r.nearCm == null ? null : normNearCm(r.nearCm);
        var size = r.sizeMm == null ? null : num(r.sizeMm);
        if (size !== null && ROOGAN_SIZES.indexOf(size) < 0) size = null;
        var dist = r.distCm == null ? null : normNearCm(r.distCm);
        var rg = ['red', 'green', 'same'].indexOf(r.redGreen) >= 0 ? r.redGreen : null;
        if (near === null && size === null && rg === null) return null;
        return { at: at, nearCm: near, sizeMm: size, distCm: size === null ? null : dist, redGreen: rg };
      }),
    };
  }

  // --- バックアップファイル（README「ツールを追加するとき」20。決定 D31） ---
  // 形式: { tool, version, exportedAt, data }。data はブラウザに保存しているものと同じ形
  var BACKUP_VERSION = 1;

  /** 書き出すファイル名: <ツール名>-backup-YYYYMMDD.json（日付は端末の時計） */
  function backupFileName(tool, date) {
    var d = date || new Date();
    return tool + '-backup-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
  }

  /** 書き出す中身 */
  function buildBackup(tool, data, date) {
    return { tool: tool, version: BACKUP_VERSION, exportedAt: (date || new Date()).toISOString(), data: data };
  }

  /**
   * 読み込んだファイルの文字列を確かめる。中身の正規化は normRecords で行う
   * @returns {{ok: true, data: object} | {ok: false, error: string}} error は画面にそのまま出す文
   */
  function parseBackup(text, tool, requiredKeys) {
    var o;
    try { o = JSON.parse(text); } catch (e) { o = null; }
    if (!o || typeof o !== 'object' || Array.isArray(o) || typeof o.tool !== 'string') {
      return { ok: false, error: 'ファイルを読み取れませんでした。このツールの「ファイルに書き出す」で作った .json ファイルを選んでください。' };
    }
    if (o.tool !== tool) {
      return { ok: false, error: 'ほかのツール（' + o.tool.slice(0, 40) + '）のファイルです。このツールで書き出したファイルを選んでください。' };
    }
    if (o.version !== BACKUP_VERSION) {
      return { ok: false, error: typeof o.version === 'number' && o.version > BACKUP_VERSION
        ? '新しい版のツールで書き出したファイルのため読み込めません。ページを再読み込みしてから、もう一度お試しください。'
        : 'ファイルの形式が正しくないため読み込めません。' };
    }
    var data = o.data;
    var missing = !data || typeof data !== 'object' || Array.isArray(data) ||
      (requiredKeys || []).some(function (k) { return data[k] === undefined || data[k] === null; });
    if (missing) return { ok: false, error: 'ファイルの中身が足りないため読み込めません。' };
    return { ok: true, data: data };
  }

  var api = {
    mean: mean, median: median,
    TONE_GAIN: TONE_GAIN, TONE_MAX_GAIN: TONE_MAX_GAIN, TONE_SECONDS: TONE_SECONDS, TONE_RAMP: TONE_RAMP, CHECK_FREQ: CHECK_FREQ, TEST_FREQS: TEST_FREQS,
    playableFreqs: playableFreqs, mimiPlan: mimiPlan, mimiResult: mimiResult,
    HANSHA_TRIALS: HANSHA_TRIALS, HANSHA_TOO_FAST: HANSHA_TOO_FAST, HANSHA_WAIT_MIN: HANSHA_WAIT_MIN, HANSHA_WAIT_MAX: HANSHA_WAIT_MAX,
    hanshaWait: hanshaWait, hanshaJudge: hanshaJudge, hanshaSummary: hanshaSummary, rulerMs: rulerMs, G: G,
    DOUTAI_LEVELS: DOUTAI_LEVELS, DOUTAI_LIVES: DOUTAI_LIVES, doutaiNext: doutaiNext,
    KIOKU_START: KIOKU_START, KIOKU_MAX: KIOKU_MAX, KIOKU_TRIES: KIOKU_TRIES, kiokuDigits: kiokuDigits, kiokuCheck: kiokuCheck, kiokuNext: kiokuNext,
    CARD_W_MM: CARD_W_MM, CARD_H_MM: CARD_H_MM, CSS_PX_PER_MM: CSS_PX_PER_MM, SCALE_MIN: SCALE_MIN, SCALE_MAX: SCALE_MAX,
    pxPerMmFromCard: pxPerMmFromCard, normScale: normScale, mmToPt: mmToPt,
    ROOGAN_SIZES: ROOGAN_SIZES, normNearCm: normNearCm,
    REC_MAX: REC_MAX, normRecords: normRecords,
    backupFileName: backupFileName, buildBackup: buildBackup, parseBackup: parseBackup,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
