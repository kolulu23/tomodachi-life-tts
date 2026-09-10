// SSML is generated here; input markup is always escaped and treated as text.
export const escapeSpeechText = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
const lifts = [0, 5, 10, 20];
export function sentenceLilt(text, language, level) {
  const lift = lifts[Math.round(level) - 1];
  if (!lift) return escapeSpeechText(text);
  const locale =
    language === 'cmn' ? 'zh-Hans' : language === 'yue' ? 'zh-Hant' : language;
  const sentences = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const words = new Intl.Segmenter(locale, { granularity: 'word' });
  return Array.from(sentences.segment(text), ({ segment }) => {
    let count = 0,
      end = 0;
    for (const part of words.segment(segment)) {
      // Stop the opening phrase at punctuation or after three lexical words.
      if (count && /[,;:，；：]/.test(part.segment)) break;
      if (!part.isWordLike) continue;
      end = part.index + part.segment.length;
      if (++count === 3) break;
    }
    if (!end) return escapeSpeechText(segment);
    return `<prosody pitch="+${lift}%">${escapeSpeechText(segment.slice(0, end))}</prosody>${escapeSpeechText(segment.slice(end))}`;
  }).join('');
}
