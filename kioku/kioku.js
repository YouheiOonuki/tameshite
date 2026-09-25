// ===========================
// 記憶力テスト（K95） — 1 秒に 1 つ出る数字を覚えて、同じ順番（または逆から）に答える
// 3 けたから 1 けたずつ増やす。同じ長さで 2 回まちがえたら終わり（calc.js の kiokuNext）
// ===========================
(function () {
  'use strict';
  var Calc = window.Calc, T = window.Tameshite, $ = T.$;
  var stage = $('stage'), msg = $('stage-msg'), answerBox = $('answer'), line = $('answer-line'), startBtn = $('start');
  var el = { result: $('result'), rsub: $('result-sub'), recTable: $('rec-table'), recState: $('rec-state') };
  var SHOW_MS = 800, GAP_MS = 200;   // 1 つを 0.8 秒見せて 0.2 秒あける（1 秒に 1 つ）
  var st = null, digits = [], typed = '', reverse = false, timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function show(html) { msg.innerHTML = html; }

  function round() {
    typed = '';
    line.innerHTML = '&nbsp;';
    answerBox.hidden = true;
    digits = Calc.kiokuDigits(st.len, Math.random);
    show('<span class="big">' + st.len + ' けた</span><span class="sub">よく見て覚える</span>');
    var t = 1000;
    digits.forEach(function (d) {
      timers.push(setTimeout(function () { show('<span class="show-digit">' + d + '</span>'); }, t));
      timers.push(setTimeout(function () { show('<span class="show-digit">&nbsp;</span>'); }, t + SHOW_MS));
      t += SHOW_MS + GAP_MS;
    });
    timers.push(setTimeout(function () {
      show('<span class="big">' + (reverse ? '逆から' : '同じ順番で') + '答える</span><span class="sub">下のボタンで入れて「決定」</span>');
      answerBox.hidden = false;
    }, t));
  }

  function key(d) {
    if (answerBox.hidden || typed.length >= st.len) return;
    typed += d;
    line.textContent = typed;
  }
  function del() { typed = typed.slice(0, -1); line.innerHTML = typed || '&nbsp;'; }
  function submit() {
    if (answerBox.hidden || !typed) return;
    var ok = Calc.kiokuCheck(digits, typed, reverse);
    answerBox.hidden = true;
    st = Calc.kiokuNext(st, ok);
    show('<span class="big">' + (ok ? '正解' : 'ちがいます') + '</span><span class="sub">' + (ok ? '' : '答えは ' + (reverse ? digits.slice().reverse() : digits).join('')) + '</span>');
    if (st.done) return finish();
    timers.push(setTimeout(round, 1300));
  }

  function finish() {
    el.result.textContent = st.best ? st.best + ' けた' : '—';
    el.rsub.textContent = st.best ? (reverse ? '逆から' : '同じ順番で') + '答えられた一番長いけた数です。' : Calc.KIOKU_START + ' けたで 2 回まちがえました。';
    $('start-row').hidden = false;
    $('mode-row').hidden = false;
    startBtn.textContent = 'もう一度';
    T.addRecord('kioku', { best: st.best, reverse: reverse });
    renderRecords();
    st = null;
  }

  startBtn.addEventListener('click', function () {
    clearTimers();
    reverse = document.querySelector('input[name="mode"]:checked').value === 'rev';
    st = { len: Calc.KIOKU_START, tries: 0, best: 0, done: false };
    $('start-row').hidden = true;
    $('mode-row').hidden = true;
    el.result.textContent = '—';
    el.rsub.textContent = 'テストの途中です。';
    stage.scrollIntoView({ block: 'start' });
    round();
  });
  [].forEach.call(answerBox.querySelectorAll('button[data-d]'), function (b) {
    b.addEventListener('click', function () { key(b.getAttribute('data-d')); });
  });
  $('del').addEventListener('click', del);
  $('ok').addEventListener('click', submit);
  document.addEventListener('keydown', function (e) {
    if (answerBox.hidden) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); key(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); del(); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });

  function renderRecords() {
    var list = T.records().kioku.slice().reverse();
    el.recState.textContent = list.length ? list.length + ' 回（最新 ' + (list[0].best || '—') + ' けた）' : 'まだありません';
    el.recTable.innerHTML = list.length ? '<tr><th>日時</th><th>答え方</th><th class="num">けた</th></tr>' + list.map(function (r) {
      return '<tr><td>' + T.fmtDate(r.at) + '</td><td>' + (r.reverse ? '逆から' : '同じ順番') + '</td><td class="num">' + (r.best || '—') + '</td></tr>';
    }).join('') : '';
  }
  T.backupSetup({ kind: 'kioku', afterImport: renderRecords, afterClear: renderRecords });
  renderRecords();
  T.registerSW('../sw.js');
})();
