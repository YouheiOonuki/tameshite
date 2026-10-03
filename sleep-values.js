// ===========================
// 睡眠の計算（Sleep calculator、英語ページ。K68）— 使っている外部の事実と出典（値・出典・確認日をセットで 1 か所に）
// 睡眠の周期の長さと 1 晩の周期の数、年齢ごとの推奨の睡眠時間は米国 NIH の NHLBI のページ（2026-10-03 に取得して確認。
// どちらも「Last updated on March 24, 2022」）。寝つくまでの時間は出典のある平均を見つけられなかったので値として持たず、
// 利用者が変えられる初期値（15 分）とし、画面と使い方ページにそう書く（WRITING: 嘘・捏造は不可）。
// ブラウザでは window.SleepValues、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  var CHECKED = '2026-10-03';
  var V = {
    CHECKED: CHECKED,
    STALE_MONTHS: 12,
    SOURCES: {
      stages: {
        label: 'NHLBI (NIH): Sleep Phases and Stages',
        fact: 'The cycle starts over every 80 to 100 minutes. Usually there are four to six cycles per night. You may wake up briefly between cycles.',
        url: 'https://www.nhlbi.nih.gov/health/sleep/stages-of-sleep',
        checked: CHECKED,
      },
      enough: {
        label: 'NHLBI (NIH): How Much Sleep Is Enough?',
        fact: 'Experts recommend that adults sleep between 7 and 9 hours a night. Recommended hours by age (including naps). Talk to your doctor if you think you are sleeping too much or too little.',
        url: 'https://www.nhlbi.nih.gov/health/sleep/how-much-sleep',
        checked: CHECKED,
      },
    },
    cycle: { min: 80, max: 100, def: 90, step: 5 },   // 分（NHLBI: 80〜100 分）
    cycles: [6, 5, 4],                                 // NHLBI: 1 晩にふつう 4〜6 周期
    latencyDefault: 15,                                // 寝つくまでの分（出典のある値ではない。利用者が変える初期値）
    latencyMax: 120,
    // 年齢ごとの推奨（NHLBI。昼寝を含む・1 日あたり。新生児（4 か月未満）は幅が広いので出さない）
    ages: [
      { id: 'adult', label: 'Adults', min: 7, max: 9 },
      { id: 'teen', label: 'Teens 13 to 18', min: 8, max: 10 },
      { id: 'child', label: 'Children 6 to 12', min: 9, max: 12 },
      { id: 'pre', label: 'Children 3 to 5', min: 10, max: 13 },
      { id: 'tod', label: 'Children 1 to 2', min: 11, max: 14 },
      { id: 'baby', label: 'Babies 4 months to 1 year', min: 12, max: 16 },
    ],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
  else root.SleepValues = V;
})(this);
