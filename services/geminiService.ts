import { GoogleGenAI, Type } from "@google/genai";

// FIX: Initialize GoogleGenAI according to guidelines.
// The API key is sourced directly from `process.env.API_KEY` and we assume it is always available.
// Redundant checks for the key have been removed.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const classifyGenresBatch = async (
  animeList: { title: string; synopsis: string | null }[],
  genres: string[]
): Promise<Record<string, string[]>> => {
  if (animeList.length === 0) {
    return {};
  }
  
  const prompt = `
    Please analyze the following list of anime, provided as a JSON array. 
    For each anime, determine the most relevant genres from the provided genre list. 
    If a synopsis is not available, infer the genres from the title. 
    Return a maximum of three genres per anime.

    Your response MUST be a single, valid JSON object where each key is the anime title 
    and the value is an array of strings representing the assigned genres. 
    Do not include any text, explanations, or markdown formatting outside of the JSON object.

    Provided Genre List:
    [${genres.join(', ')}]

    Anime List:
    ${JSON.stringify(animeList.map(a => ({title: a.title, synopsis: a.synopsis?.substring(0, 300) || null})), null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text.trim();
    // Sometimes the model wraps the JSON in ```json ... ```, so we need to clean it.
    const cleanedJson = responseText.replace(/^```json\s*|```\s*$/g, '');
    
    const parsed = JSON.parse(cleanedJson);
    return parsed;

  } catch (error) {
    console.error("Gemini genre classification failed:", error);
    // Return an empty object on failure to prevent app crash
    return {};
  }
};


export const findPrequelTitle = async (animeTitle: string): Promise<string | null> => {
  const prompt = `アニメ「${animeTitle}」の直接の前編にあたる作品の正式な日本語タイトルを一つだけ教えてください。もし前編が存在しない場合は、「なし」とだけ返答してください。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        temperature: 0.1, // Low temperature for factual answer
      },
    });

    const prequelTitle = response.text.trim();

    if (prequelTitle === 'なし' || !prequelTitle) {
      console.log(`Gemini response for prequel of "${animeTitle}": No prequel found.`);
      return null;
    }
    
    // Clean up potential Gemini additions like quotes or markdown
    const cleanedTitle = prequelTitle.replace(/['"「」』『]/g, '').trim();
    console.log(`Gemini response for prequel of "${animeTitle}": "${cleanedTitle}"`);
    return cleanedTitle;

  } catch (error) {
    console.error("Gemini prequel search failed:", error);
    return null;
  }
};

export const findStreamingServices = async (animeTitle: string): Promise<string[]> => {
  const prompt = `アニメ「${animeTitle}」が日本国内で視聴可能な主要な動画配信サービスを調べてください。特に、Netflix, Amazonプライム・ビデオについて言及してください。見つかったサービス名をコンマ区切りで、名称のみを返してください。例: Netflix, Amazonプライム・ビデオ`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        temperature: 0, // We want factual, non-creative answers
      },
    });

    const servicesText = response.text.trim();
    if (!servicesText) {
      console.log(`Gemini found no streaming services for "${animeTitle}".`);
      return [];
    }

    const foundServices: string[] = [];
    const serviceNames = servicesText.split(',').map(s => s.trim().toLowerCase());

    // Map found names to our internal service IDs
    if (serviceNames.some(s => s.includes('netflix') || s.includes('ネットフリックス'))) {
      foundServices.push('netflix');
    }
    if (serviceNames.some(s => s.includes('amazon') || s.includes('prime video') || s.includes('アマゾンプライム'))) {
      foundServices.push('amazon_prime_video');
    }

    console.log(`Gemini search for "${animeTitle}" found services: ${foundServices.join(', ')}`);
    return foundServices;

  } catch (error) {
    console.error(`Gemini streaming service search failed for "${animeTitle}":`, error);
    return []; // Return empty array on error
  }
};

export const getGeminiRecommendation = async (title: string, description: string): Promise<string> => {
  const hasSynopsis = description && description !== 'あらすじはありません。';
  
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

export const translateSynopsesBatch = async (
  animeList: { title: string; synopsis: string | null }[]
): Promise<Record<string, string>> => {
  const animesToTranslate = animeList.filter(a => a.synopsis);
  if (animesToTranslate.length === 0) {
    return {};
  }

  const prompt = `
    以下の英語のアニメあらすじを、自然で流暢な日本語に翻訳してください。
    あなたのレスポンスは、必ずキーがアニメのタイトル、バリューが翻訳された日本語のあらすじである、単一の有効なJSONオブジェクトでなければなりません。
    JSONオブジェクト以外のテキスト、説明、マークダウンフォーマットは一切含めないでください。

    Anime List (English Synopses):
    ---
    ${JSON.stringify(
      Object.fromEntries(
        animesToTranslate.map(a => [a.title, a.synopsis])
      ),
      null,
      2
    )}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text.trim();
    const cleanedJson = responseText.replace(/^```json\s*|```\s*$/g, '');
    const parsed = JSON.parse(cleanedJson);
    return parsed;
  } catch (error) {
    console.error("Gemini batch synopsis translation failed:", error);
    return {};
  }
};