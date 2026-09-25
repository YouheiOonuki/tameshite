// ===========================
// 老眼チェック（K115。高齢者向け・広告なし: D118） — 画面の実寸合わせ・近点・字の大きさ・赤緑
// 実寸は 1 mm あたりの CSS px（tameshite_scale）。カードの短い辺（53.98 mm）を横にして合わせる
// ===========================
(function () {
  'use strict';
  var Calc = window.Calc, T = window.Tameshite, $ = T.$;
  var el = { result: $('result'), rsub: $('result-sub'), recTable: $('rec-table'), recState: $('rec-state') };

  // --- タブ（1 画面に 1 つ） ---
  var tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });

  // --- ① 画面合わせ ---
  var range = $('fit-range'), shape = $('card-shape'), stateEl = $('scale-state');
  var saved = T.scale();
  var pxPerMm = saved || Calc.CSS_PX_PER_MM;
  function scaleNow() { return T.scale() || Calc.CSS_PX_PER_MM; }
  function drawCard() {
    shape.style.width = (Calc.CARD_H_MM * pxPerMm).toFixed(1) + 'px';
    shape.style.height = (Calc.CARD_W_MM * pxPerMm).toFixed(1) + 'px';
    range.value = pxPerMm;
  }
  function showScaleState() {
    var s = T.scale();
    stateEl.textContent = s ? '合わせ済み（1 mm ＝ ' + s.toFixed(2) + ' px）。② 〜 ④ はこの大きさで出します。'
      : 'まだ合わせていません。② 〜 ④ は仮の大きさ（実際とずれます）で出しています。';
  }
  function setPx(v) {
    pxPerMm = Math.min(Calc.SCALE_MAX, Math.max(Calc.SCALE_MIN, v));
    drawCard();
  }
  range.addEventListener('input', function () { setPx(Number(range.value)); });
  $('fit-minus').addEventListener('click', function () { setPx(pxPerMm - 0.02); });
  $('fit-plus').addEventListener('click', function () { setPx(pxPerMm + 0.02); });
  $('fit-save').addEventListener('click', function () {
    var v = Calc.pxPerMmFromCard(shape.getBoundingClientRect().width, Calc.CARD_H_MM);
    if (!isFinite(v)) return;
    T.setScale(v);
    showScaleState();
    drawSizes();
    stateEl.textContent += ' 次は ② へ。';
  });
  drawCard();
  showScaleState();

  // --- ② 近点 ---
  var NEAR_MM = 2;   // 見る字の大きさ（字の枠の高さ）
  function drawNear() { $('near-target').style.fontSize = (NEAR_MM * scaleNow()).toFixed(2) + 'px'; }
  $('near-save').addEventListener('click', function () {
    var cm = Calc.normNearCm($('near-cm').value);
    if (cm === null) { el.rsub.textContent = '距離は 5〜200 cm で入れてください。'; return; }
    T.addRecord('roogan', { nearCm: cm });
    el.result.textContent = '近点 ' + cm + ' cm';
    el.rsub.textContent = 'これより近いと、' + NEAR_MM + ' mm の字がぼやけ始めるということです。たいていの人は 40 歳ごろから老眼を自覚し始め、45 歳くらいで老眼鏡が必要になります（日本眼科医会）。';
    renderRecords();
  });

  // --- ③ 字の大きさ ---
  var rows = $('size-rows');
  var SAMPLE = 'あさひ 3869';
  function drawSizes() {
    drawNear();
    var px = scaleNow();
    var checked = (rows.querySelector('input:checked') || {}).value;
    rows.querySelectorAll('.size-row').forEach(function (n) { n.remove(); });
    Calc.ROOGAN_SIZES.forEach(function (mm) {
      var lab = document.createElement('label');
      lab.className = 'size-row';
      var target = mm * px;   // 字の枠の高さ（CSS px）。小さい字は最小フォントの設定に左右されないよう、40px の字を縮小して出す
      lab.innerHTML = '<input type="radio" name="size" value="' + mm + '"' + (String(mm) === checked ? ' checked' : '') + '>' +
        '<span class="s-text"><span style="transform:scale(' + (target / 40).toFixed(4) + ')">' + SAMPLE + '</span></span>' +
        '<span class="s-mm">' + mm + ' mm（約 ' + Calc.mmToPt(mm).toFixed(1) + ' pt）</span>';
      lab.querySelector('.s-text').style.height = Math.max(target * 1.15, 8).toFixed(1) + 'px';
      rows.appendChild(lab);
    });
  }
  $('size-save').addEventListener('click', function () {
    var c = rows.querySelector('input:checked');
    var dist = Calc.normNearCm($('size-cm').value);
    if (!c) { el.rsub.textContent = '読める一番小さい行を選んでください。'; return; }
    var mm = Number(c.value);
    T.addRecord('roogan', { sizeMm: mm, distCm: dist });
    el.result.textContent = mm + ' mm の字まで';
    el.rsub.textContent = (dist ? dist + ' cm 離して、' : '') + '字の枠の高さ ' + mm + ' mm（約 ' + Calc.mmToPt(mm).toFixed(1) + ' ポイント）まで読めました。' + (T.scale() ? '' : '① で画面を合わせていないので、実際の大きさとずれています。');
    renderRecords();
  });
  drawSizes();

  // --- ④ 赤と緑 ---
  var RG = { red: '赤の側', green: '緑の側', same: '同じくらい' };
  [].forEach.call(document.querySelectorAll('[data-rg]'), function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-rg');
      T.addRecord('roogan', { redGreen: v });
      el.result.textContent = v === 'same' ? '同じくらい' : RG[v] + 'がくっきり';
      el.rsub.textContent = v === 'same' ? '赤と緑で差はありませんでした。'
        : '眼科では、赤と緑の見え方の差を、めがね・コンタクトの度数が合っているかを見る手がかりにします。この距離に今のめがね（またはめがね無し）が合っているかは、眼科・眼鏡店で確かめてください。';
      renderRecords();
    });
  });

  // --- 記録 ---
  function renderRecords() {
    var list = T.records().roogan.slice().reverse();
    el.recState.textContent = list.length ? list.length + ' 件' : 'まだありません';
    el.recTable.innerHTML = list.length ? '<tr><th>日時</th><th>結果</th></tr>' + list.map(function (r) {
      var s = r.nearCm !== null ? '近点 ' + r.nearCm + ' cm' : r.sizeMm !== null ? (r.distCm ? r.distCm + ' cm で ' : '') + r.sizeMm + ' mm の字' : '赤緑: ' + RG[r.redGreen];
      return '<tr><td>' + T.fmtDate(r.at) + '</td><td>' + s + '</td></tr>';
    }).join('') : '';
  }
  T.backupSetup({ kind: 'roogan', afterImport: function () { pxPerMm = scaleNow(); drawCard(); showScaleState(); drawSizes(); renderRecords(); }, afterClear: renderRecords });
  renderRecords();
  T.registerSW('../sw.js');
})();
