/**
 * Profanity Filter
 * Censors inappropriate words in user-generated content like usernames
 */

// List of inappropriate words (add more as needed)
const INAPPROPRIATE_WORDS = [
  // Common profanity
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 'piss',
  'bastard', 'dick', 'cock', 'pussy', 'cunt', 'fag', 'whore', 'slut',
  // Variations and common misspellings
  'f**k', 'sh*t', 'a**', 'b*tch', 'fuk', 'fuq', 'fck', 'shyt', 'azz',
  // Offensive slurs
  'nigger', 'nigga', 'retard', 'retarded', 'faggot', 'chink', 'spic',
  // Sexual content
  'sex', 'porn', 'nude', 'xxx', 'penis', 'vagina', 'boob', 'tit',
  // Other inappropriate
  'nazi', 'hitler', 'kill', 'murder', 'rape', 'terrorist', 'bomb',
];

/**
 * Censors inappropriate words in a string
 * @param text The text to filter
 * @param replacement The replacement string (default: '***')
 * @returns The filtered text
 */
export function censorProfanity(text: string, replacement: string = '***'): string {
  if (!text) return text;
  
  let filteredText = text;
  
  // Create a regex pattern for each inappropriate word (case-insensitive)
  INAPPROPRIATE_WORDS.forEach(word => {
    // Escape special regex characters
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match the word with word boundaries (whole word or part of word)
    const regex = new RegExp(escapedWord, 'gi');
    
    // Replace with censored version
    filteredText = filteredText.replace(regex, replacement);
  });
  
  return filteredText;
}

/**
 * Checks if text contains inappropriate words
 * @param text The text to check
 * @returns True if inappropriate content is found
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  return INAPPROPRIATE_WORDS.some(word => {
    const regex = new RegExp(word, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Sanitizes a username for display
 * - Censors profanity
 * - Trims whitespace
 * - Limits length
 * @param username The username to sanitize
 * @param maxLength Maximum length (default: 50)
 * @returns The sanitized username
 */
export function sanitizeUsername(username: string, maxLength: number = 50): string {
  if (!username) return 'Anonymous';
  
  // Trim and limit length
  let sanitized = username.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  // Censor profanity
  sanitized = censorProfanity(sanitized);
  
  // If after filtering the name is empty or just asterisks, return Anonymous
  if (!sanitized || /^[\*\s]+$/.test(sanitized)) {
    return 'Anonymous';
  }
  
  return sanitized;
}

