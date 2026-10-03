// 共有される結果（yorozu-plans K124・企画書 60）の着地ページを作る（反射・記憶・耳）
//   node tools/build-share.mjs          作る（<テスト>/s/<種類>.html）
//   node tools/build-share.mjs --check  今のファイルと同じかだけを確かめる（tests から呼ぶ）
// OG 画像（<テスト>/s/<種類>.png）は tools/make-share-og.mjs（Playwright）で作る。種類は calc.js の shareKinds（それぞれ 12 以内）
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { stubHtml, ogHtml, writeAll } from './share-stub.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const Calc = require(path.join(ROOT, 'calc.js'));
const SITE = 'https://yorozu-craft.com/tameshite/';
export const TESTS = {
  hansha: { name: '反射神経テスト', small: '色が変わったらタップ。5 回の中央値', bg: '#1c1814', fg: '#f5ede4', accent: '#7ed957' },
  kioku: { name: '記憶力テスト', small: '1 つずつ出る数字を覚えて答える', bg: '#18202a', fg: '#eef2f6', accent: '#ffd166' },
  mimi: { name: 'モスキート音テスト', small: '聞こえた一番高い音（年齢には換算しません）', bg: '#141c24', fg: '#e8f0f6', accent: '#7cc6ff' },
};

export function pages() {
  const out = [];
  for (const [t, o] of Object.entries(TESTS)) {
    for (const k of Calc.shareKinds(t)) {
      const label = Calc.shareKindLabel(t, k);
      out.push({
        file: `${t}/s/${k}.html`, image: `${t}/s/${k}.png`,
        stub: stubHtml({
          title: `${o.name} ${label}｜ためして`, desc: `${o.name}の結果「${label}」。遊びの目安で、医療の検査ではありません。`,
          url: `${SITE}${t}/s/${k}.html`, image: `${SITE}${t}/s/${k}.png`, back: '../', canonical: `${SITE}${t}/`, open: `${o.name}を開く`,
        }),
        og: ogHtml({ kicker: `ためして｜${o.name}`, big: label, small: o.small, url: `yorozu-craft.com/tameshite/${t}/`, bg: o.bg, fg: o.fg, accent: o.accent }),
      });
    }
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  const diff = writeAll(ROOT, Object.fromEntries(pages().map((p) => [p.file, p.stub])), check);
  if (check && diff.length) { console.error('作り直しが要る: ' + diff.join(', ')); process.exit(1); }
  console.log(check ? 'OK' : `書いた ${diff.length} 件`);
}
