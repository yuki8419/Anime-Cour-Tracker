import { GoogleGenAI, Type } from "@google/genai";

// FIX: Initialize GoogleGenAI according to guidelines.
// The API key is sourced directly from `process.env.API_KEY` and we assume it is always available.
// Redundant checks for the key have been removed.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// NOTE: The primary data enrichment functions (classifyGenresBatch, findPrequelTitle, 
// translateSynopsesBatch) have been removed. The application now relies on a static, 
// pre-researched dataset in `data/animeEnrichmentData.ts` for better performance, 
// data consistency, and stability.

/**
 * Generates a compelling recommendation for an anime based on its title and description.
 * This function is kept for potential future features but is not currently used in the main data flow.
 * @param title The title of the anime.
 * @param description The synopsis of the anime.
 * @returns A promise that resolves to a string containing the recommendation.
 */
export const getGeminiRecommendation = async (title: string, description: string): Promise<string> => {
  const hasSynopsis = description && description !== 'あらすじはありません。' && description !== 'この作品のあらすじは、現在準備中です。';
  
  const prompt = `
    以下のアニメのタイトル${hasSynopsis ? 'とあらすじ' : ''}を基に、視聴を検討している人に向けて、簡潔で魅力的なおすすめ文（2〜3文）を作成してください。
    どのような視聴者におすすめできるかを説明してください。
    ${hasSynopsis ? '単にあらすじを繰り返すのは避けてください。' : 'あらすじが不明なため、タイトルから推測されるジャンルや雰囲気を基に、一般的なアニメファンへのアピールポイントを考えてください。'}
    
    タイトル: ${title}
    ${hasSynopsis ? `あらすじ: ${description}` : ''}
    
    おすすめ文:
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.7,
            topP: 1,
            topK: 32,
            maxOutputTokens: 150,
            // FIX: Per coding guidelines, when setting maxOutputTokens for gemini-2.5-flash,
            // a thinkingBudget must also be set to reserve tokens for the output.
            thinkingConfig: { thinkingBudget: 50 },
        }
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Gemini APIからのおすすめ生成に失敗しました。");
  }
};
