import { Replacements } from '../../rpx-translation.service';

export const replacePlaceholders = (input: string, replacements: Replacements) => {
  Object.keys(replacements).forEach((key) => {
    // Ideally use replaceAll here, but that isn't fully compatible with targeted browsers and packaging yet
    const search = `%${key}%`;
    while (input.indexOf(search) !== -1) {
      input = input.replace(search, replacements[key]);
    }
  });

  return input;
};

// Helper method to split the phrase into components, preserving placeholders and text separately
export const splitPhraseIntoComponents = (phrase: string, replacements: Record<string, string>): string[] => {
  const result: string[] = [];
  const placeholders = Object.keys(replacements).map((key) => `%${key}%`);
  phrase = phrase.trim();

  // Regular expression to match all placeholders in the phrase
  const placeholderRegex = new RegExp(placeholders.join('|'), 'g');

  let lastIndex = 0;

  // Helper function to split text into spaces and content
  const splitTextIntoComponents = (text: string): string[] => {
    const components: string[] = [];
    const trimmed = text.trim();

    if (text.startsWith(' ')) {
      components.push(' ');
    } // Leading space
    if (trimmed) {
      components.push(trimmed);
    } // Content (if any)
    if (text.endsWith(' ')) {
      components.push(' ');
    } // Trailing space

    return components;
  };

  // Process the phrase by matching placeholders
  phrase.replace(placeholderRegex, (placeholder, offset) => {
    if (offset > lastIndex) {
      // Add text before the placeholder
      result.push(...splitTextIntoComponents(phrase.slice(lastIndex, offset)));
    }

    // Add the replacement for the placeholder
    const replacementKey = placeholder.slice(1, -1);
    const replacement = replacements[replacementKey]?.trim();
    if (replacement) {
      result.push(replacement);
    }

    lastIndex = offset + placeholder.length; // Update lastIndex
    return ''; // Required by `replace`, but not used here
  });

  // Add any remaining text after the last match
  if (lastIndex < phrase.length) {
    result.push(...splitTextIntoComponents(phrase.slice(lastIndex)));
  }

  return result;
};

// Literal components bypass translation and storage entirely.
export const splitWithLiterals = (phrase: string, replacements: Replacements, literals: Replacements): { value: string; literal: boolean }[] => {
  const keys = [...Object.keys(replacements), ...Object.keys(literals)];
  if (Object.keys(literals).some((key) => Object.hasOwn(replacements, key))) {
    throw new Error('A replacement cannot be both literal and translatable');
  }
  if (!keys.length) return [{ value: phrase.trim(), literal: false }];
  const escaped = keys.sort((a, b) => b.length - a.length).map((key) => `%${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}%`);
  const pattern = new RegExp(escaped.join('|'), 'g');
  const components: { value: string; literal: boolean }[] = [];
  const appendText = (text: string) => {
    if (text.startsWith(' ')) components.push({ value: ' ', literal: false });
    if (text.trim()) components.push({ value: text.trim(), literal: false });
    if (text.endsWith(' ')) components.push({ value: ' ', literal: false });
  };
  const input = phrase.trim();
  let last = 0;
  for (const match of input.matchAll(pattern)) {
    appendText(input.slice(last, match.index));
    const key = match[0].slice(1, -1);
    if (Object.hasOwn(literals, key)) components.push({ value: literals[key], literal: true });
    else if (replacements[key]?.trim()) components.push({ value: replacements[key].trim(), literal: false });
    last = match.index + match[0].length;
  }
  appendText(input.slice(last));
  return components;
};
