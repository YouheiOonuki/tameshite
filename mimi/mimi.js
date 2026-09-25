// ===========================
// モスキート音テスト（K94） — 画面の制御と Web Audio
// 音量の上限は calc.js の TONE_GAIN（これより大きくする操作は無い）。1 回に 1 音だけ、立ち上がりと消え際をなだらかにする
// ===========================
(function () {
  'use strict';
  var Calc = window.Calc, T = window.Tameshite, $ = T.$;

  var ctx = null, current = null;
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function stopTone() {
    if (current) { try { current.stop(); } catch (e) { /* 止まっている */ } current = null; }
  }
  /** 1 音を鳴らす。音量は TONE_GAIN で固定（上限） */
  function playTone(freq) {
    var a = audio();
    if (!a) return false;
    stopTone();
    var t = a.currentTime + 0.03;
    var osc = a.createOscillator();
    var g = a.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(Calc.TONE_GAIN, t + Calc.TONE_RAMP);
    g.gain.setValueAtTime(Calc.TONE_GAIN, t + Calc.TONE_SECONDS - Calc.TONE_RAMP);
    g.gain.linearRampToValueAtTime(0, t + Calc.TONE_SECONDS);
    osc.connect(g).connect(a.destination);
    osc.start(t);
    osc.stop(t + Calc.TONE_SECONDS + 0.05);
    current = osc;
    osc.onended = function () { if (current === osc) current = null; };
    return true;
  }
  function fmtHz(f) { return f.toLocaleString('ja-JP') + ' Hz'; }

  var el = {
    check: $('check'), start: $('start'), test: $('test'), status: $('test-status'), yes: $('yes'), no: $('no'), again: $('again'), stop: $('stop'),
    result: $('result'), sub: $('result-sub'), freqs: $('freqs'), recTable: $('rec-table'), recState: $('rec-state'),
  };
  var noAudioMsg = 'このブラウザでは音を鳴らせません（Web Audio が使えません）。';

  el.check.addEventListener('click', function () {
    if (!playTone(Calc.CHECK_FREQ)) el.sub.textContent = noAudioMsg;
  });

  // --- テストの進行 ---
  var plan = [], idx = 0, answers = [], waitTimer = 0;
  function setAnswerable(on) { el.yes.disabled = !on; el.no.disabled = !on; el.again.disabled = !on; }
  function present() {
    var step = plan[idx];
    setAnswerable(false);
    el.status.textContent = (idx + 1) + ' 回目: 鳴らしています…';
    if (step.kind === 'tone') playTone(step.freq);
    clearTimeout(waitTimer);
    waitTimer = setTimeout(function () {
      setAnswerable(true);
      el.status.textContent = (idx + 1) + ' 回目: 聞こえましたか？';
    }, Calc.TONE_SECONDS * 1000 + 100);
  }
  function answer(heard) {
    var step = plan[idx];
    answers.push({ kind: step.kind, freq: step.freq, heard: heard });
    if (step.kind === 'tone' && !heard) return finish(true);
    idx += 1;
    if (idx >= plan.length) return finish(true);
    present();
  }
  function finish(save) {
    clearTimeout(waitTimer);
    stopTone();
    el.test.hidden = true;
    el.start.disabled = false;
    el.start.textContent = '② もう一度スタート';
    if (!save) { el.sub.textContent = 'やめました。'; return; }
    var r = Calc.mimiResult(answers);
    el.result.textContent = r.highest === null ? '—' : fmtHz(r.highest);
    var s = r.highest === null
      ? fmtHz(plan[0] && plan[0].freq || 8000) + ' が「聞こえない」でした。端末の消音・音量の設定と、スピーカーをふさいでいないかを確かめてください（音量は上げすぎない）。'
      : '聞こえた一番高い音です。' + (r.stoppedAt ? fmtHz(r.stoppedAt) + ' は「聞こえない」でした。' : '用意した一番高い音まで聞こえました。');
    if (r.falseAlarm) s += ' 音を出さない回に「聞こえた」がありました。周りの音や耳鳴りを聞いたのかもしれません。静かな所でもう一度どうぞ。';
    el.sub.textContent = s;
    T.addRecord('mimi', { highest: r.highest, falseAlarm: r.falseAlarm });
    renderRecords();
    $('result-card').focus({ preventScroll: false });
  }

  el.start.addEventListener('click', function () {
    if (!audio()) { el.sub.textContent = noAudioMsg; return; }
    var freqs = Calc.playableFreqs(ctx.sampleRate);
    var silentAt = 1 + Math.floor(Math.random() * Math.min(4, freqs.length - 1));
    plan = Calc.mimiPlan(freqs, silentAt);
    idx = 0; answers = [];
    el.test.hidden = false;
    el.start.disabled = true;
    el.result.textContent = '—';
    el.sub.textContent = 'テストの途中です。';
    el.test.scrollIntoView({ block: 'center' });
    present();
  });
  el.yes.addEventListener('click', function () { answer(true); });
  el.no.addEventListener('click', function () { answer(false); });
  el.again.addEventListener('click', function () { present(); });
  el.stop.addEventListener('click', function () { finish(false); });

  // --- 好きな高さを 1 つ鳴らす ---
  Calc.TEST_FREQS.forEach(function (f) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-sub btn-sm';
    b.textContent = fmtHz(f);
    b.addEventListener('click', function () {
      var a = audio();
      if (!a) { el.sub.textContent = noAudioMsg; return; }
      if (f >= a.sampleRate / 2) { el.sub.textContent = 'この端末の設定（' + a.sampleRate + ' Hz）では ' + fmtHz(f) + ' を鳴らせません。'; return; }
      playTone(f);
    });
    el.freqs.appendChild(b);
  });

  // --- 記録 ---
  function renderRecords() {
    var list = T.records().mimi.slice().reverse();
    el.recState.textContent = list.length ? list.length + ' 回（最新 ' + (list[0].highest ? fmtHz(list[0].highest) : '—') + '）' : 'まだありません';
    el.recTable.innerHTML = list.length ? '<tr><th>日時</th><th class="num">聞こえた一番高い音</th></tr>' + list.map(function (r) {
      return '<tr><td>' + T.fmtDate(r.at) + '</td><td class="num">' + (r.highest ? fmtHz(r.highest) : '—') + (r.falseAlarm ? '（無音に「聞こえた」）' : '') + '</td></tr>';
    }).join('') : '';
  }
  T.backupSetup({ kind: 'mimi', afterImport: renderRecords, afterClear: renderRecords });
  renderRecords();
  T.registerSW('../sw.js');
})();
