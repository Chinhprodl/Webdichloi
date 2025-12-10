import { GoogleGenAI } from "@google/genai";
import { Job } from '../types';

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const CHUNK_SIZE = 75; // Number of subtitle entries per API call.

/**
 * Splits SRT content into manageable chunks to avoid API limits.
 * @param srtContent The full content of the SRT file.
 * @returns An array of strings, where each string is a chunk of the SRT file.
 */
const splitSrtIntoChunks = (srtContent: string): string[] => {
  // Regex to split SRT file into individual subtitle blocks, handles various line endings
  const entries = srtContent.trim().split(/(?:\r?\n){2,}/);
  if (entries.length === 1 && entries[0] === '') return [];
  
  const chunks: string[] = [];
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    // Re-join the blocks with double newlines to form a valid SRT chunk
    const chunk = entries.slice(i, i + CHUNK_SIZE).join('\n\n');
    chunks.push(chunk);
  }
  return chunks;
};

export const extractGlossary = async (fileContent: string, job: Job, signal: AbortSignal): Promise<Record<string, string>> => {
  if (!ai) {
    throw new Error("Lỗi cấu hình: Khóa API Gemini chưa được đặt.");
  }
  if (signal.aborted) throw new DOMException('Request aborted by user.', 'AbortError');

  const systemInstruction = `Bạn là một công cụ phân tích ngôn ngữ cho phụ đề, chuyên về tính nhất quán của nhân vật và thuật ngữ khi dịch từ ${job.sourceLang} sang ${job.targetLang}. Nhiệm vụ của bạn là quét nội dung phụ đề sau và xác định các thuật ngữ chính cho một bảng chú giải thuật ngữ dịch thuật.

**TRỌNG TÂM QUAN TRỌNG:** Mục tiêu chính của bạn là xác định **tên riêng** và **cách xưng hô** để đảm bảo việc thể hiện giới tính trong bản dịch là chính xác và nhất quán. Tránh nhầm lẫn giữa các nhân vật nam và nữ.

**NỘI DUNG CẦN TRÍCH XUẤT:**
1.  **Danh từ riêng:**
    *   Tên người (ví dụ: "John", "Mary"). Với mỗi tên, hãy cố gắng suy ra giới tính của họ (Nam/Nữ) từ ngữ cảnh.
    *   Tên địa danh (ví dụ: "Winterfell").
    *   Tên tổ chức (ví dụ: "Stark Industries").
2.  **Đại từ nhân xưng & Cách xưng hô theo giới tính:**
    *   Xác định cách các nhân vật xưng hô với nhau (ví dụ: "Mr. Smith", "Miss Bennet", "honey", "sir").
    *   Nếu có thể, hãy tạo các mục trong bảng chú giải chỉ rõ mối quan hệ và ngữ cảnh giới tính.
3.  **Thuật ngữ kỹ thuật hoặc biệt ngữ lặp lại:**
    *   Bất kỳ cụm từ độc đáo, quan trọng nào khác xuất hiện nhiều lần.

**ĐỊNH DẠNG ĐẦU RA:**
- Phản hồi của bạn **BẮT BUỘC** phải là một đối tượng JSON hợp lệ duy nhất.
- Key (khóa) phải là thuật ngữ gốc từ ngôn ngữ nguồn.
- Value (giá trị) phải là bản dịch đề xuất của bạn sang ngôn ngữ đích.
- Đối với tên nhân vật, bạn có thể thêm gợi ý về giới tính của họ trong bản dịch nếu điều đó hữu ích, ví dụ: "John (nam)" hoặc "Mary (nữ)".

**Ví dụ phản hồi cho tiếng Anh sang tiếng Việt:**
{
  "Naruto": "Naruto (nam)",
  "Sakura": "Sakura (nữ)",
  "Hokage": "Hỏa Ảnh",
  "Konohagakure": "Làng Lá",
  "Jutsu": "Thuật",
  "Mr. Anderson": "Ông Anderson"
}

Không bao gồm bất kỳ văn bản, giải thích hoặc định dạng markdown nào khác như \`\`\`json. Chỉ xuất ra đối tượng JSON thô. Nếu không tìm thấy thuật ngữ nào, hãy trả về một đối tượng JSON rỗng như {}.`;

  const userContent = `**Source Language:** ${job.sourceLang}
**Target Language:** ${job.targetLang}
**Subtitle Content to Analyze (first 20000 chars):**
---
${fileContent.substring(0, 20000)}
---
`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userContent,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        }
    });

    if (signal.aborted) {
      throw new DOMException('Request aborted by user.', 'AbortError');
    }
    
    const jsonString = response.text.trim();
    const cleanedJsonString = jsonString.replace(/^```json\s*|```$/g, '');
    const glossary = JSON.parse(cleanedJsonString);
    return glossary;

  } catch (error) {
    console.error(`Gemini API Error during glossary extraction:`, error);
    let errorMessage = `Lỗi khi trích xuất thuật ngữ.`;
     if (error instanceof Error) {
        if (error.name === 'AbortError') throw error;
        errorMessage += ` Lỗi API Gemini: ${error.message}`;
    } else {
        errorMessage += ' Đã xảy ra lỗi không xác định khi gọi API Gemini.';
    }
    throw new Error(errorMessage);
  }
};


export const translateSrt = async (job: Job, fileContent: string, onProgress: (progress: number, current: number, total: number) => void, signal: AbortSignal): Promise<string> => {
  if (!ai) {
    throw new Error("Lỗi cấu hình: Khóa API Gemini chưa được đặt. Vui lòng cấu hình biến môi trường API_KEY.");
  }
  if (signal.aborted) throw new DOMException('Request aborted by user.', 'AbortError');
  
  let glossaryInstructions = '';
  if (job.glossary && Object.keys(job.glossary).length > 0) {
      const glossaryItems = Object.entries(job.glossary)
          .map(([key, value]) => `- Translate "${key}" as "${value}"`)
          .join('\n');
      glossaryInstructions = `
**GLOSSARY (MUST FOLLOW):**
You MUST strictly adhere to the following translations for these specific terms. Do not deviate.
${glossaryItems}
`;
  }

  const systemInstruction = `You are an expert subtitle translator. Your task is to translate the provided subtitle content from ${job.sourceLang} to ${job.targetLang}.
${glossaryInstructions}
**CRITICAL RULES:**
1.  **ONLY** translate the actual dialogue or text portions of the subtitles.
2.  **DO NOT** alter subtitle index numbers (e.g., 1, 2, 3...).
3.  **DO NOT** alter timestamps (e.g., \`00:00:20,000 --> 00:00:24,400\`).
4.  **PRESERVE FORMATTING TAGS:** Keep all original formatting tags (like \`<i>\`, \`<b>\`, \`<u>\`, \`<font>\`, etc.) and their positions relative to the translated text. For example, if the original is \`<i>Hello</i> world\`, the Vietnamese translation should be \`<i>Xin chào</i> thế giới\`.
5.  **PRESERVE LINE BREAKS:** Maintain the original line breaks within each subtitle text block.
6.  **ACCURATE GENDER PRONOUNS:** Pay close attention to the context of the dialogue to infer the gender of speakers and their relationships. Use the most appropriate and natural-sounding Vietnamese pronouns and terms of address (e.g., anh, chị, em, cô, chú, ông, bà). This is crucial for a high-quality translation.
7.  Adhere to the user's specific translation instructions for tone and style.
8.  Your final output **MUST** be only the valid, translated subtitle content. Do not include any extra explanations, notes, or markdown formatting like \`\`\`srt.`;

  const chunks = splitSrtIntoChunks(fileContent);
  if (chunks.length === 0) {
    onProgress(100, 0, 0);
    return "";
  }

  const totalChunks = chunks.length;
  let completedChunksCount = 0;

  // Process chunks in parallel for maximum speed
  const translationPromises = chunks.map(async (chunk, i) => {
    if (signal.aborted) {
      throw new DOMException('Request aborted by user.', 'AbortError');
    }

    const userContent = `**User's Translation Instructions:**
${job.prompt}

**Subtitle Content to Translate (Chunk ${i + 1} of ${totalChunks}):**
---
${chunk}
---
  `;

    try {
      const response = await ai.models.generateContent({
          model: job.model,
          contents: userContent,
          config: {
            systemInstruction,
          }
      });
      
      if (signal.aborted) {
        throw new DOMException('Request aborted by user.', 'AbortError');
      }

      // Update progress as each chunk finishes
      completedChunksCount++;
      const progress = Math.round((completedChunksCount / totalChunks) * 100);
      onProgress(progress, completedChunksCount, totalChunks);

      return response.text.trim();
    } catch (error) {
      console.error(`Gemini API Error on chunk ${i + 1}:`, error);
      let errorMessage = `Lỗi khi dịch đoạn ${i + 1}/${totalChunks}.`;
      if (error instanceof Error) {
          if (error.name === 'AbortError') throw error;
          errorMessage += ` Lỗi API Gemini: ${error.message}`;
      } else {
          errorMessage += ' Đã xảy ra lỗi không xác định khi gọi API Gemini.';
      }
      throw new Error(errorMessage);
    }
  });

  const translatedChunks = await Promise.all(translationPromises);
  return translatedChunks.join('\n\n');
};