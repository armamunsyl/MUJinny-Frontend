/**
 * PDF intent detection — covers both Unicode Bangla and romanized transliteration.
 *
 * Romanized variants captured:
 *   "pdf kore daw"  "pdf dao"  "pdf banao"  "pdf de"  "pdf daw"
 *   "make pdf"  "download pdf"  "export pdf"  "generate pdf"
 *   "pdf koro"  "pdf tiri"  "pdf nao"
 */
const PDF_INTENT_RE =
    /\bpdf\b[\s\S]{0,40}?\b(kore|koro|banao|banaw|bano|dao|daw|de|do|nao|tiri|create|make|generate|download|export|save|করে|বানাও|দাও|তৈরি|নামাও|দে)\b|\b(download|export|make|create|generate|save)\b[\s\S]{0,20}?\bpdf\b/i;

export const isPdfIntent = (text) => PDF_INTENT_RE.test(String(text || '').trim());

export const parsePdfOptions = (text) => ({
    includeAnswers: !/উত্তর\s*(ছাড়া|বাদ)|without\s*answer|no\s*answer/i.test(text),
    numbering: !/নম্বর\s*(ছাড়া|বাদ)|without\s*number/i.test(text),
    pageBreakPerQuestion: /প্রতি\s*(প্রশ্নে|question)\s*(নতুন\s*পাতা|page\s*break)|page\s*break\s*per/i.test(text),
    headerFooter: !/header.*footer\s*(ছাড়া|বাদ|remove|no)/i.test(text.toLowerCase()),
});

export const extractPdfTitle = (text, fallback = 'MUJinny Export') => {
    const m = text.match(/(?:title|শিরোনাম)\s*[:\-–]\s*[""]?([^""\n]+?)[""]?(?:\s|$)/i);
    return m ? m[1].trim().slice(0, 80) : fallback;
};

/** Returns true when text looks like an MCQ set (3+ numbered questions with A/B/C/D options). */
export const isMcqContent = (text) => {
    const questionLines = (text.match(/^\s*\d+[.)]\s/gm) || []).length;
    const optionLines   = (text.match(/^\s*[A-Da-d][.)]\s/gm) || []).length;
    return questionLines >= 3 && optionLines >= 6;
};
