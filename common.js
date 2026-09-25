// ===========================
// ためして — 各ページで共通の画面の部品（保存・記録・書き出し・読み込み・Service Worker）
// calc.js のあとに読む。window.Tameshite に置く
// ===========================
(function () {
  'use strict';
  var Calc = window.Calc;

  // --- ブラウザへの保存（README「ツールを追加するとき」12） ---
  // キーは必ず "tameshite_" で始める。全ツールが同じオリジンで localStorage を共有しているため
  var PREFIX = 'tameshite_';
  var store = {
    get: function (name) {
      try {
        var v = localStorage.getItem(PREFIX + name);
        return v === null ? null : JSON.parse(v);
      } catch (e) { return null; }   // 保存できない環境（プライベートモードなど）でも動くように
    },
    set: function (name, value) {
      try { localStorage.setItem(PREFIX + name, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove: function (name) { try { localStorage.removeItem(PREFIX + name); } catch (e) { /* 続ける */ } },
  };

  function $(id) { return document.getElementById(id); }

  // --- 記録: tameshite_records に { mimi: [], hansha: [], doutai: [], kioku: [], roogan: [] } ---
  function records() { return Calc.normRecords(store.get('records')); }
  function addRecord(kind, rec) {
    var all = records();
    rec.at = new Date().toISOString();
    all[kind].push(rec);
    all = Calc.normRecords(all);
    store.set('records', all);
    return all[kind];
  }
  function clearRecords(kind) {
    var all = records();
    all[kind] = [];
    store.set('records', all);
  }

  // 画面の実寸（1 mm あたりの CSS px）。老眼チェックで合わせたもの。無ければ null
  function scale() { var s = store.get('scale'); return s && Calc.normScale(s.pxPerMm); }
  function setScale(pxPerMm) { store.set('scale', { pxPerMm: pxPerMm, at: new Date().toISOString() }); }

  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  // --- ファイルへの書き出し・読み込み（README「ツールを追加するとき」20。決定 D31） ---
  // このサイトの 5 つのテストの記録と画面の実寸をまとめて 1 つのファイルにする（data は保存と同じ形: { records, scale }）
  var TOOL = 'tameshite';
  function backupSetup(o) {
    var msg = $('rec-msg');
    $('rec-export').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(Calc.buildBackup(TOOL, { records: records(), scale: store.get('scale') }), null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = Calc.backupFileName(TOOL);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      msg.textContent = 'ファイルに書き出しました（5 つのテストの記録をまとめて）。機種変更のときは、新しい端末で「ファイルから読み込む」を押してください。';
    });
    $('rec-import').addEventListener('click', function () { $('rec-file').click(); });
    $('rec-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (file.size > 1024 * 1024) { msg.textContent = 'ファイルが大きすぎます。このツールで書き出したファイルを選んでください。'; return; }
      file.text().then(function (text) {
        var r = Calc.parseBackup(text, TOOL, ['records']);
        if (!r.ok) { msg.textContent = r.error; return; }
        if (!window.confirm('ファイルの内容で、この端末に保存している記録を置き換えます。よろしいですか？')) return;
        store.set('records', Calc.normRecords(r.data.records));
        var s = r.data.scale && Calc.normScale(r.data.scale.pxPerMm);
        if (s) setScale(s);
        if (o && o.afterImport) o.afterImport();
        msg.textContent = 'ファイルから読み込みました。';
      }, function () { msg.textContent = 'ファイルを読み取れませんでした。'; });
    });
    $('rec-reset').addEventListener('click', function () {
      if (!window.confirm('このテストの記録を、この端末から消します。よろしいですか？')) return;
      clearRecords(o.kind);
      if (o.afterClear) o.afterClear();
      msg.textContent = 'この端末から消しました。';
    });
  }

  // --- Service Worker（オフラインで開けるように。README 13: 相対の sw.js だけで登録。scope を指定しない） ---
  function registerSW(path) {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      window.addEventListener('load', function () { navigator.serviceWorker.register(path).catch(function () {}); });
    }
  }

  window.Tameshite = { store: store, $: $, records: records, addRecord: addRecord, clearRecords: clearRecords, scale: scale, setScale: setScale, fmtDate: fmtDate, backupSetup: backupSetup, registerSW: registerSW };
})();
