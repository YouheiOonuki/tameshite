// ===========================
// 反射神経テスト（K95） — 合図（緑）からタップまでの時間を測る
// 合図の時刻は色を変えた requestAnimationFrame の時刻、押した時刻は pointerdown / keydown の event.timeStamp（どちらも performance.now() と同じ物差し）
// ===========================
(function () {
  'use strict';
  var Calc = window.Calc, T = window.Tameshite, $ = T.$;
  var stage = $('stage'), big = $('stage-big'), sub = $('stage-sub'), status = $('stage-status');
  var el = { result: $('result'), rsub: $('result-sub'), recTable: $('rec-table'), recState: $('rec-state') };

  var state = 'idle';   // idle | waiting | go | between | done
  var times = [], waitTimer = 0, signalAt = null, lastInput = 'touch';

  function setStage(cls, b, s) {
    stage.className = 'stage' + (cls ? ' ' + cls : '');
    big.textContent = b; sub.textContent = s || '';
  }
  function now(e) {
    // event.timeStamp は performance.now() と同じ基準の高分解能の時刻（古いブラウザで違う基準なら使わない）
    var p = performance.now();
    return e && e.timeStamp > 0 && e.timeStamp <= p + 1 && p - e.timeStamp < 1000 ? e.timeStamp : p;
  }

  function startWait() {
    state = 'waiting';
    signalAt = null;
    setStage('wait', '待って…', '緑になったらすぐ押す');
    status.textContent = (times.length + 1) + ' / ' + Calc.HANSHA_TRIALS + ' 回目';
    clearTimeout(waitTimer);
    waitTimer = setTimeout(function () {
      requestAnimationFrame(function (ts) {
        if (state !== 'waiting') return;
        setStage('go', '今！', '');
        signalAt = ts;
        state = 'go';
      });
    }, Calc.hanshaWait(Math.random()));
  }

  function press(e, input) {
    var t = now(e);
    lastInput = input;
    if (state === 'idle' || state === 'between' || state === 'done') {
      if (state === 'done' || state === 'idle') { times = []; T.clearShared(); }
      startWait();
      return;
    }
    if (state === 'waiting') {
      clearTimeout(waitTimer);
      state = 'between';
      setStage('bad', '早すぎました', 'タップでこの回をやり直し');
      return;
    }
    if (state !== 'go') return;
    var j = Calc.hanshaJudge(signalAt, t);
    if (j.kind !== 'ok') {
      state = 'between';
      setStage('bad', '先読みかも', Calc.HANSHA_TOO_FAST + ' ms 未満は数えません。タップでやり直し');
      return;
    }
    times.push(j.ms);
    if (times.length >= Calc.HANSHA_TRIALS) return finish(j.ms);
    state = 'between';
    setStage('', Math.round(j.ms) + ' ms', 'タップで次へ（' + times.length + ' / ' + Calc.HANSHA_TRIALS + '）');
  }

  function finish(lastMs) {
    state = 'done';
    var s = Calc.hanshaSummary(times);
    setStage('', Math.round(lastMs) + ' ms', 'おわり。タップでもう一度');
    status.textContent = '5 回: ' + times.map(function (x) { return Math.round(x); }).join('・') + ' ms';
    el.result.textContent = '中央値 ' + s.median + ' ms';
    el.rsub.textContent = '平均 ' + s.mean + ' ms・最速 ' + s.best + ' ms（' + (lastInput === 'key' ? 'キーボード' : lastInput === 'mouse' ? 'マウス' : 'タッチ') + '）。同じ端末・同じ押し方どうしで比べてください。';
    var rec = { median: s.median, mean: s.mean, best: s.best, input: lastInput };
    T.addRecord('hansha', rec);
    renderRecords();
    T.shareCard({ test: 'hansha', r: rec, result: el.result.textContent, sub: '平均 ' + s.mean + ' ms・最速 ' + s.best + ' ms（' + INPUT_NAME[lastInput] + '）' });
  }
  var INPUT_NAME = { key: 'キーボード', mouse: 'マウス', touch: 'タッチ', pen: 'ペン' };

  stage.addEventListener('pointerdown', function (e) {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    press(e, e.pointerType === 'mouse' ? 'mouse' : e.pointerType === 'pen' ? 'pen' : 'touch');
  });
  document.addEventListener('keydown', function (e) {
    if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY|A/.test(tag) && document.activeElement !== stage) return;
    e.preventDefault();
    press(e, 'key');
  });

  // --- 定規の換算 ---
  var rulerIn = $('ruler-cm'), rulerOut = $('ruler-ms');
  rulerIn.addEventListener('input', function () {
    var ms = rulerIn.value === '' ? NaN : Calc.rulerMs(rulerIn.value);
    rulerOut.textContent = isFinite(ms) && Number(rulerIn.value) <= 100 ? '約 ' + Math.round(ms) + ' ms' : '—';
  });
  $('ruler-table').innerHTML = '<tr><th>落ちた長さ</th><th class="num">時間</th></tr>' + [5, 10, 15, 20, 25, 30].map(function (cm) {
    return '<tr><td>' + cm + ' cm</td><td class="num">約 ' + Math.round(Calc.rulerMs(cm)) + ' ms</td></tr>';
  }).join('');

  // --- 記録 ---
  function renderRecords() {
    var list = T.records().hansha.slice().reverse();
    el.recState.textContent = list.length ? list.length + ' 回（最新 中央値 ' + list[0].median + ' ms）' : 'まだありません';
    var name = { key: 'キー', mouse: 'マウス', touch: 'タッチ', pen: 'ペン' };
    el.recTable.innerHTML = list.length ? '<tr><th>日時</th><th class="num">中央値</th><th class="num">最速</th><th>押し方</th></tr>' + list.map(function (r) {
      return '<tr><td>' + T.fmtDate(r.at) + '</td><td class="num">' + r.median + ' ms</td><td class="num">' + r.best + ' ms</td><td>' + name[r.input] + '</td></tr>';
    }).join('') : '';
  }
  // --- 共有の URL（#m=…）で開いたとき: 送った人の結果を出す（記録には入れない） ---
  var shared = T.sharedResult('hansha');
  if (shared) {
    el.result.textContent = '中央値 ' + shared.median + ' ms';
    el.rsub.textContent = '共有された結果です。スタートを押すと、あなたの反応を測ります。';
    T.sharedCard({ test: 'hansha', r: shared, result: el.result.textContent, sub: '平均 ' + shared.mean + ' ms・最速 ' + shared.best + ' ms（' + INPUT_NAME[shared.input] + '）',
      again: function () { stage.scrollIntoView({ block: 'center' }); stage.focus({ preventScroll: true }); } });
  }
  T.backupSetup({ kind: 'hansha', afterImport: renderRecords, afterClear: renderRecords });
  renderRecords();
  T.registerSW('../sw.js');
})();
