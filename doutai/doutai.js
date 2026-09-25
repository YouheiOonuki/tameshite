// ===========================
// 動体視力テスト（K95） — 1〜9 の数字が枠を横切る。見えた数字を押す
// 横切る時間は calc.js の DOUTAI_LEVELS（段が上がるほど短い）。2 回まちがえたら終わり
// ===========================
(function () {
  'use strict';
  var Calc = window.Calc, T = window.Tameshite, $ = T.$;
  var stage = $('stage'), mover = $('mover'), msg = $('stage-msg'), status = $('stage-status'), keypad = $('keypad'), startBtn = $('start');
  var el = { result: $('result'), rsub: $('result-sub'), recTable: $('rec-table'), recState: $('rec-state') };
  var keys = [].slice.call(keypad.querySelectorAll('button'));
  var st = null, digit = 0, raf = 0, busy = false;

  function sec(level) { return Calc.DOUTAI_LEVELS[level]; }
  function levelText(i) { return (i + 1) + ' 段（' + sec(i) + ' 秒で横切る）'; }
  function setKeys(on) { keys.forEach(function (b) { b.disabled = !on; }); }

  function round() {
    busy = true;
    setKeys(false);
    var d;
    do { d = 1 + Math.floor(Math.random() * 9); } while (d === digit);
    digit = d;
    msg.hidden = false;
    msg.innerHTML = '<span class="big">＋</span><span class="sub">' + levelText(st.level) + '</span>';
    status.textContent = 'まちがえてよいのはあと ' + (Calc.DOUTAI_LIVES - st.misses) + ' 回';
    setTimeout(function () {
      msg.hidden = true;
      var W = stage.clientWidth;
      var size = Math.max(36, Math.min(96, Math.round(stage.clientHeight * 0.3)));
      mover.style.fontSize = size + 'px';
      mover.textContent = String(digit);
      mover.hidden = false;
      var w = mover.offsetWidth;
      var fromLeft = Math.random() < 0.5;
      var x0 = fromLeft ? -w : W, x1 = fromLeft ? W : -w;
      var dur = sec(st.level) * 1000, t0 = null;
      mover.style.transform = 'translate(' + x0 + 'px, -50%)';
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        mover.style.transform = 'translate(' + (x0 + (x1 - x0) * p) + 'px, -50%)';
        if (p < 1) { raf = requestAnimationFrame(step); return; }
        mover.hidden = true;
        msg.hidden = false;
        msg.innerHTML = '<span class="big">どの数字？</span><span class="sub">下のボタンで答える</span>';
        busy = false;
        setKeys(true);
      });
    }, 800);
  }

  function answer(d) {
    if (busy || !st) return;
    var ok = d === digit;
    setKeys(false);
    st = Calc.doutaiNext(st, ok);
    msg.innerHTML = '<span class="big">' + (ok ? '正解' : 'ちがいます') + '</span><span class="sub">' + (ok ? '' : '答えは ' + digit) + '</span>';
    if (st.done) return finish();
    busy = true;
    setTimeout(round, 900);
  }

  function finish() {
    var c = st.cleared;
    el.result.textContent = c < 0 ? '—' : (c + 1) + ' 段';
    el.rsub.textContent = c < 0 ? '1 段目（2.0 秒で横切る）で 2 回まちがえました。明るさや画面の向きを変えてもう一度どうぞ。'
      : sec(c) + ' 秒で横切る数字まで正解しました（全 ' + Calc.DOUTAI_LEVELS.length + ' 段）。';
    status.textContent = 'おわり。';
    keypad.hidden = true;
    $('start-row').hidden = false;
    startBtn.textContent = 'もう一度';
    T.addRecord('doutai', { cleared: c });
    renderRecords();
    st = null;
  }

  startBtn.addEventListener('click', function () {
    st = { level: 0, misses: 0, cleared: -1, done: false };
    digit = 0;
    $('start-row').hidden = true;
    keypad.hidden = false;
    el.result.textContent = '—';
    el.rsub.textContent = 'テストの途中です。';
    stage.scrollIntoView({ block: 'start' });
    round();
  });
  keys.forEach(function (b) { b.addEventListener('click', function () { answer(Number(b.getAttribute('data-d'))); }); });
  document.addEventListener('keydown', function (e) {
    if (/^[1-9]$/.test(e.key) && !keypad.hidden) { e.preventDefault(); answer(Number(e.key)); }
  });

  function renderRecords() {
    var list = T.records().doutai.slice().reverse();
    el.recState.textContent = list.length ? list.length + ' 回（最新 ' + (list[0].cleared < 0 ? '—' : (list[0].cleared + 1) + ' 段') + '）' : 'まだありません';
    el.recTable.innerHTML = list.length ? '<tr><th>日時</th><th class="num">正解した一番速い段</th></tr>' + list.map(function (r) {
      return '<tr><td>' + T.fmtDate(r.at) + '</td><td class="num">' + (r.cleared < 0 ? '—' : levelText(r.cleared)) + '</td></tr>';
    }).join('') : '';
  }
  T.backupSetup({ kind: 'doutai', afterImport: renderRecords, afterClear: renderRecords });
  renderRecords();
  T.registerSW('../sw.js');
})();
