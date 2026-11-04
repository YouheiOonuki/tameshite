// ===========================
// 睡眠の計算（Sleep calculator、英語ページ。K68）— 画面の制御
// 計算は ../../sleep.js、値と出典は ../../sleep-values.js にだけ置く。入力はブラウザに保存しない（K123 の消すボタンは不要）
// ===========================
(function () {
  'use strict';
  var S = window.Sleep, V = window.SleepValues;
  var $ = function (id) { return document.getElementById(id); };
  var form = document.querySelector('main');
  var state = { mode: 'wake', time: '07:00' };

  for (var c = V.cycle.min; c <= V.cycle.max; c += V.cycle.step) {
    var o = document.createElement('option'); o.value = String(c); o.textContent = c + ' minutes' + (c === V.cycle.def ? ' (default)' : ''); $('cycle').appendChild(o);
  }
  V.ages.forEach(function (a) { var o = document.createElement('option'); o.value = a.id; o.textContent = a.label + ' (' + a.min + ' to ' + a.max + ' hours)'; $('age').appendChild(o); });
  $('cycle-hint').textContent = 'Cycles last about ' + V.cycle.min + ' to ' + V.cycle.max + ' minutes.';

  function fill() {
    var d = S.normalizeInput(state);
    form.querySelectorAll('[data-k]').forEach(function (el) {
      if (el.type === 'radio') el.checked = el.value === d.mode;
      else el.value = String(d[el.dataset.k]);
    });
  }
  function render() {
    var r = S.calc(state), d = r.input, wake = d.mode === 'wake';
    $('time-label').textContent = wake ? 'Wake-up time' : 'Bedtime';
    $('st-adjust').textContent = d.latency + ' min to fall asleep, ' + d.cycle + '-minute cycles, ' + r.range.label.toLowerCase();
    var b = r.options[r.best];
    $('r-lead').textContent = wake ? 'Go to bed at' : 'Wake up at';
    $('r-big').textContent = b.label;
    $('r-detail').textContent = b.cycles + ' cycles, ' + S.hours(b.sleepMin) + ' of sleep' + (d.latency ? ', after ' + d.latency + ' minutes to fall asleep' : '') + '.';
    var ul = $('r-list'); ul.textContent = '';
    r.options.forEach(function (o, i) {
      var li = document.createElement('li'); if (i === r.best) li.className = 'best';
      var a = document.createElement('span'); a.textContent = o.cycles + ' cycles · ' + S.hours(o.sleepMin);
      var t = document.createElement('span'); t.className = 't'; t.textContent = o.label;
      li.appendChild(a); li.appendChild(t); ul.appendChild(li);
    });
    var any = r.options.some(function (o) { return o.inRange; });
    $('r-range').textContent = any
      ? 'Recommended for ' + r.range.label.toLowerCase() + ': ' + r.range.min + ' to ' + r.range.max + ' hours a day.'
      : 'Recommended for ' + r.range.label.toLowerCase() + ': ' + r.range.min + ' to ' + r.range.max + ' hours a day, naps included. None of these times reaches that.';
    window.yzUsed?.();
  }
  function onField(e) {
    var el = e.target; if (!el.dataset || !el.dataset.k) return;
    if (el.type === 'radio' && !el.checked) return;
    state[el.dataset.k] = el.value;
    render();
  }
  form.addEventListener('input', onField);
  form.addEventListener('change', onField);
  fill();
  render();
})();
