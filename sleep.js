// ===========================
// 睡眠の計算（Sleep calculator、英語ページ。K68）— 画面から切り離した純粋関数
// 起きる時刻から寝る時刻（または寝る時刻から起きる時刻）を、周期の長さ × 周期の数 ＋ 寝つくまでの時間で出す。
// 時刻は 0:00 からの分（0〜1439）で持ち、日付をまたぐときは 1440 で回す。値は sleep-values.js にだけ置く
// ブラウザでは window.Sleep、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var V = isNode ? require('./sleep-values.js') : root.SleepValues;
  var DAY = 1440;

  function parseTime(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }
  function wrap(n) { return ((n % DAY) + DAY) % DAY; }
  function fmt12(n) {
    n = wrap(n);
    var h = Math.floor(n / 60), m = n % 60, ap = h < 12 ? 'AM' : 'PM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }
  function fmt24(n) { n = wrap(n); var h = Math.floor(n / 60), m = n % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function hours(min) { var h = Math.floor(min / 60), m = min % 60; return h + ' h' + (m ? ' ' + m + ' min' : ''); }

  function normalizeInput(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var c = V.cycle;
    var cyc = Math.round(Number(r.cycle));
    if (!isFinite(cyc) || cyc < c.min || cyc > c.max) cyc = c.def;
    var lat = Math.round(Number(r.latency));
    if (r.latency === undefined || r.latency === null || String(r.latency).trim() === '' || !isFinite(lat) || lat < 0) lat = V.latencyDefault;
    lat = Math.min(lat, V.latencyMax);
    var t = parseTime(r.time);
    return {
      mode: r.mode === 'bed' ? 'bed' : 'wake',
      time: t === null ? '07:00' : fmt24(t),
      cycle: cyc,
      latency: lat,
      age: V.ages.some(function (a) { return a.id === r.age; }) ? r.age : 'adult',
    };
  }

  // 戻り値 { input, options: [{ cycles, sleepMin, time（分）, label, inRange }], best（推奨の幅に入る最も短い案の位置）, range }
  function calc(raw) {
    var d = normalizeInput(raw);
    var t = parseTime(d.time);
    var range = V.ages.filter(function (a) { return a.id === d.age; })[0];
    var options = V.cycles.map(function (n) {
      var sleep = n * d.cycle;
      // 起きる時刻から: 寝る時刻 ＝ 起きる − 周期 × 数 − 寝つくまで。寝る時刻から: 起きる ＝ 寝る ＋ 寝つくまで ＋ 周期 × 数
      var time = d.mode === 'wake' ? wrap(t - sleep - d.latency) : wrap(t + d.latency + sleep);
      return { cycles: n, sleepMin: sleep, time: time, label: fmt12(time), inRange: sleep >= range.min * 60 && sleep <= range.max * 60 };
    });
    // 大きく出す案: 推奨の幅に入る案のうち睡眠が最も短いもの（起きる時刻からなら最も遅く寝られる）。無ければ最も長いもの
    var best = -1;
    options.forEach(function (o, i) { if (o.inRange && (best < 0 || o.sleepMin < options[best].sleepMin)) best = i; });
    if (best < 0) best = 0;
    return { input: d, options: options, best: best, range: range };
  }

  var api = { parseTime: parseTime, fmt12: fmt12, fmt24: fmt24, hours: hours, normalizeInput: normalizeInput, calc: calc };
  if (isNode) module.exports = api;
  else root.Sleep = api;
})(this);
