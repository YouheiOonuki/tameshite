// 睡眠の計算の使い方（英語）— 周期・初期値・例の時刻・確認日を値ファイルと計算から入れる（値を HTML に写さない）
(function () {
  'use strict';
  var V = window.SleepValues, S = window.Sleep;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var c = V.CHECKED.split('-');
  var ex = S.calc({ mode: 'wake', time: '07:00', cycle: 90, latency: 15 }).options;
  var v = {
    checked: MONTHS[Number(c[1]) - 1] + ' ' + Number(c[2]) + ', ' + c[0],
    cmin: String(V.cycle.min), cmax: String(V.cycle.max), cdef: String(V.cycle.def),
    nmin: String(Math.min.apply(null, V.cycles)), nmax: String(Math.max.apply(null, V.cycles)),
    lat: String(V.latencyDefault), ex6: ex[0].label, ex5: ex[1].label,
  };
  document.querySelectorAll('[data-v]').forEach(function (el) {
    var k = el.getAttribute('data-v');
    if (v[k] !== undefined) el.textContent = v[k];
    if (k === 'checked') el.setAttribute('datetime', V.CHECKED);
  });
})();
