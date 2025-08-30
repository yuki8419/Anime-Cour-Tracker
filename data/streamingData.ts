// This file contains curated streaming service data for popular anime.
// Netflix and Amazon Prime Video do not provide public APIs for streaming availability.
// This data is manually curated and should be updated by administrators through the admin panel.
// Annict IDs are used as keys.

export const ANIME_STREAMING_MAP: Record<number, string[]> = {
  // 2025 Summer (Anticipated)
  14001: ['netflix', 'amazon_prime_video'], // 呪術廻戦 鏖殺回游
  14002: ['amazon_prime_video'],             // ぼっち・ざ・ろっく！ SEASON 2
  14003: ['amazon_prime_video', 'netflix'], // チェンソーマン レゼ篇
  14004: ['netflix'],                         // 葬送のフリーレン 第2期
  14005: ['netflix'],                         // サイバーグラディエーター・アイリス

  // 2024 Spring
  13139: ['netflix', 'amazon_prime_video'], // 無職転生 II ～異世界行ったら本気だす～（第2クール）
  13140: ['netflix', 'amazon_prime_video'], // この素晴らしい世界に祝福を！３
  13138: [], // 時々ボソッとロシア語でデレる隣のアーリャさん
  12985: ['netflix', 'amazon_prime_video'], // ゆるキャン△ SEASON３

  // 2023 Fall
  12792: ['netflix'], // 葬送のフリーレン
  12911: ['netflix', 'amazon_prime_video'], // 薬屋のひとりごと
  12948: ['netflix'], // SPY×FAMILY Season 2
  
  // 2023 Summer
  12533: ['netflix', 'amazon_prime_video'], // 呪術廻戦 懐玉・玉折／渋谷事変
  12845: ['netflix'], // BLEACH 千年血戦篇-訣別譚-
  
  // 2023 Spring
  12613: ['netflix', 'amazon_prime_video'], // 【推しの子】
  12616: ['netflix'], // 機動戦士ガンダム 水星の魔女 Season2
  12953: [], // 天国大魔境
  
  // 2022 Fall
  12298: ['amazon_prime_video'], // ぼっち・ざ・ろっく！
  11874: ['amazon_prime_video', 'netflix'], // チェンソーマン
  
  // Other Popular
  11475: ['netflix', 'amazon_prime_video'], // 進撃の巨人 The Final Season
  11094: ['netflix'], // 鬼滅の刃 遊郭編
};
