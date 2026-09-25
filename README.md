# ためして（耳・反射・目）

公開 URL: **https://yorozu-craft.com/tameshite/**

モスキート音・反射神経・動体視力・記憶力・老眼のセルフチェック。遊びの目安で、医療の検査ではありません。
yorozu-craft のツールの1つです（共通ルールは [youheioonuki.github.io の README](https://github.com/YouheiOonuki/youheioonuki.github.io) を参照）。

## 機能

体を測る 5 つのテスト（企画書 yorozu-plans `docs/39_ためして.md`、候補 K94・K95・K115）。どのページも本文の最初に「これは遊びの目安で、医療の検査ではありません。気になるときは眼科・耳鼻科へ。」を固定（WRITING 2 章）。

| パス | テスト | 広告 |
|---|---|---|
| `/tameshite/` | 一覧 | 通常（スクリプトあり） |
| `/mimi/` | モスキート音テスト（K94）: 8,000〜20,000 Hz を低い順に鳴らし「聞こえない」で終わる。途中に無音の回を 1 回。音量はゲイン 0.03 に固定（上げる操作なし）、0.1 秒の立ち上がり・消え際。年齢には換算しない | 画面は meta だけ・使い方は通常 |
| `/hansha/` | 反射神経（K95）: 緑になったらタップ、5 回の中央値。100 ms 未満・合図の前はやり直し。定規の落下距離 → 時間の換算 | 同上 |
| `/doutai/` | 動体視力（K95）: 1〜9 が 2.0〜0.15 秒で横切る 14 段、2 回まちがえたら終わり | 同上 |
| `/kioku/` | 記憶力（K95）: 1 秒に 1 つ出る数字を同じ順番・逆から。3〜12 けた | 同上 |
| `/roogan/` | 老眼チェック（K115・高齢者向け）: カード（ID-1 の短い辺 53.98 mm）で画面の実寸を合わせ、近点・読める字の大きさ・赤緑 | **広告なし**（画面・使い方とも meta だけ。D118）。先頭に「このページは広告なし・登録なし・入力は端末の外に出ません。」 |

- 記録は `tameshite_records`、画面の実寸は `tameshite_scale`（localStorage）。書き出し・読み込み（`tameshite-backup-YYYYMMDD.json`）と消去は各テストの「記録」から。外部には送信しない
- オフライン: `sw.js`（キャッシュ `tameshite-v1`）

## 使っている事実と出典

`constants.js` の `SOURCES`（確認日 `CHECKED`）に 1 か所で持つ。耳鼻咽喉科学会（加齢で高い音から）、W3C Web Audio（ナイキスト周波数）、MDN（performance.now の丸め）、BIPM（標準重力加速度 980.665 cm/s²）、日本眼科学会・日本眼科医会（老視）、アキュビュー（セルフチェックの前提）、眼科院長ブログ（赤緑の原理）、ISO/IEC 7810 ID-1（寸法は EU 決定 S2 で確認）、W3C CSS（1in = 96px、1pt = 1/72in）。年齢・平均の目安は、確かな出典が無いので出さない。

## 保守

| 時期 | 確認すること | 直す場所 |
|------|------------|---------|
| 確認日から 12 か月まで（check-site のメモで） | 出典のページが変わっていないか | `constants.js` の `CHECKED`、各 `guide.html` の最終確認日 |
| ファイルを足したとき | オフラインの一覧 | `sw.js` の `PRECACHE_URLS` と `CACHE_NAME`、`tests/pages.test.js` |

値や文を直したら、その `guide.html` の「更新履歴」に日付と内容を 1 行足す。

## ファイル

| ファイル | 役割 |
|---------|------|
| `index.html` | 一覧 |
| `<テスト>/index.html`・`<テスト>/<テスト>.js`・`<テスト>/guide.html` | 各テストの画面・動き・使い方 |
| `calc.js` | 判定・集計・換算・記録の正規化（純粋関数） |
| `common.js` | 保存・記録・書き出し・読み込み・Service Worker |
| `constants.js` | 出典と確認日 |
| `style.css` | 見た目（ダークモード対応） |
| `sw.js` / `manifest.webmanifest` | オフライン対応 |
| `tests/*.test.js` | `node --test tests/*.test.js` |

## ライセンス

MIT License（`LICENSE`）。
