// ===========================
// ためして（耳・反射・目） — 使っている外部の事実と出典（値・出典・確認日をセットで 1 か所に）
// 制度の値は無い（オールタイム）。出典のページが変わっていないかを確認日から 12 か月で見る（check-site が CHECKED を読む）
// ブラウザでは window.Constants、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  var CHECKED = '2026-09-25';

  var CONSTANTS = {
    CHECKED: CHECKED,
    SOURCES: {
      // 耳
      jibikaHearing: {
        label: '日本耳鼻咽喉科頭頸部外科学会「難聴について」（Hear well Enjoy life）',
        fact: '加齢による聴力の低下は一般的に高音域から始まる。40 歳代のうちはあまり自覚しないが高音域の聴力レベルは下がる。「年のせい」と決めつけずに耳鼻咽喉科医に診てもらう',
        url: 'https://www.jibika.or.jp/owned/hwel/hearingloss/',
        checked: CHECKED,
      },
      ehfStudy: {
        label: 'Rodríguez Valiente A, et al. Extended high-frequency (9–20 kHz) audiometry reference thresholds in 645 healthy subjects. Int J Audiol. 2014;53(8):531–545',
        fact: '5〜90 歳の 645 人で、聞こえの閾値は周波数と年齢とともに上がる（要旨。本文は未読）。検査機器で決まった大きさの音を出して測った値で、端末の音量が分からないこの画面の結果とは比べられない',
        url: 'https://doi.org/10.3109/14992027.2014.893375',
        checked: CHECKED,
      },
      webAudio: {
        label: 'W3C Web Audio API（2021-06-17 勧告）',
        fact: 'ナイキスト周波数はサンプリング周波数の半分。これより高い音は鳴らせない',
        url: 'https://www.w3.org/TR/webaudio-1.0/',
        checked: CHECKED,
      },
      // 反射
      hrTime: {
        label: 'MDN「Performance: now()」',
        fact: 'performance.now() は時刻攻撃・フィンガープリント対策で丸められる（分離していない文書で 100 マイクロ秒）',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Performance/now',
        checked: CHECKED,
      },
      gravity: {
        label: '第 3 回国際度量衡総会（1901 年）宣言 2（BIPM）',
        fact: '標準重力加速度 980.665 cm/s²',
        url: 'https://www.bipm.org/en/committees/cg/cgpm/3-1901/resolution-2',
        checked: CHECKED,
      },
      // 目
      nichiganPresbyopia: {
        label: '日本眼科学会「老視（老眼）」',
        fact: '老視は遠くと近くに自由にピントを変える力が衰えることで起こる。40 代くらいから近くを見る作業で不快感を感じ始める',
        url: 'https://www.nichigan.or.jp/public/disease/name.html?pdid=36',
        checked: CHECKED,
      },
      gankaikaiPresbyopia: {
        label: '日本眼科医会「40代で始まる目の老化」',
        fact: 'たいていの人は 40 歳ごろから老眼の症状を自覚し始め、45 歳くらいで老眼鏡が必要になる。老眼かなと思ったら、まず眼科専門医の診察を受ける',
        url: 'https://www.gankaikai.or.jp/health/37/',
        checked: CHECKED,
      },
      acuvueSelfCheck: {
        label: 'アキュビュー「老眼のセルフチェック方法」（医師監修。2025-06-19 更新）',
        fact: 'セルフチェックは本来近視・乱視を完全に矯正した状態で行うが、家庭では難しいので日頃使うコンタクトをつけた状態でどのくらいの距離まで近くが見えるかを見る。近くが見づらいのは老眼以外の原因（遠視・度数の変化・緑内障など）のこともあり、老眼かどうかを知るには眼科での検査が必要',
        url: 'https://www.acuvue.com/ja-jp/memamori/how-eyes-work/318/',
        checked: CHECKED,
      },
      redGreen: {
        label: '満尾医院眼科 院長ブログ「この検査なあに？ No.2 〜赤と緑のどちらがよく見えますか？〜」（2021-12-18）',
        fact: '赤は波長が長いため遠くで、緑は波長が短いため近くで焦点を結ぶ。眼科ではめがね・コンタクトの度数が合っているかを見るのに使う',
        url: 'https://sansuikai.info/blog/%E7%9C%BC%E3%81%AE%E6%A4%9C%E6%9F%BB%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6/50',
        checked: CHECKED,
      },
      cardSize: {
        label: 'ISO/IEC 7810 の ID-1（本文は有料）。寸法の文は EU 行政委員会 決定 S2（2009-06-12、官報 C 106 2010-04-24）の 3.2',
        fact: 'ID-1 は高さ 53.98 mm・幅 85.60 mm・厚さ 0.76 mm',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32010D0424(09)',
        checked: CHECKED,
      },
      cssUnits: {
        label: 'W3C CSS Values and Units',
        fact: '1in = 2.54cm = 96px、1pt = 1/72 in',
        url: 'https://www.w3.org/TR/css-values-4/#absolute-lengths',
        checked: CHECKED,
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONSTANTS;
  else root.Constants = CONSTANTS;
})(this);
