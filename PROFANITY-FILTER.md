# 🛡️ Profanity Filter for Leaderboards

## What Was Added

A profanity filter that automatically censors inappropriate words in usernames displayed on property leaderboards, ensuring a family-friendly experience for all users.

## How It Works

### Automatic Censoring
- When leaderboard data is fetched, all usernames are automatically sanitized
- Inappropriate words are replaced with `***`
- Filter is case-insensitive and catches common misspellings
- If a name becomes empty after filtering, it shows as "Anonymous"

### Features

1. **Comprehensive Word List**
   - Common profanity
   - Offensive slurs
   - Sexual content
   - Variations and misspellings
   - Easily expandable

2. **Smart Filtering**
   - Case-insensitive matching
   - Matches whole words and partial words
   - Preserves name structure (replaces only offensive parts)
   - Handles edge cases gracefully

3. **User-Friendly**
   - Seamless - users don't notice the filtering
   - No performance impact
   - Works on all leaderboard displays

## Implementation Details

### Files Created

**`src/lib/profanityFilter.ts`**
- `censorProfanity(text, replacement)` - Censors inappropriate words
- `containsProfanity(text)` - Checks if text has profanity
- `sanitizeUsername(username, maxLength)` - Complete username sanitization

### Files Modified

**`src/screens/MapScreen.tsx`**
- Import `sanitizeUsername` function
- Apply filter to usernames in `fetchLeaderboard` function
- Filters before displaying on leaderboard

## Technical Details

### Filter Process
```typescript
// 1. Raw name from database
const rawName = "John Inappropriate Smith";

// 2. Sanitize (censor profanity, trim, limit length)
const sanitizedName = sanitizeUsername(rawName);
// Result: "John *** Smith"

// 3. Display on leaderboard
<Text>{sanitizedName}</Text>
```

### Customization

**Add more words:**
Edit `INAPPROPRIATE_WORDS` array in `src/lib/profanityFilter.ts`

**Change replacement:**
```typescript
sanitizeUsername(name) // Uses *** (default)
censorProfanity(text, '[censored]') // Custom replacement
```

**Change max length:**
```typescript
sanitizeUsername(name, 30) // Limit to 30 characters
```

## Examples

| Original Name | Filtered Name |
|--------------|---------------|
| "John Smith" | "John Smith" |
| "Bad Word User" | "Bad *** User" |
| "***" (all censored) | "Anonymous" |
| "" (empty) | "Anonymous" |
| "Very Long Name..." (50+ chars) | "Very Long Name......" |

## Privacy & Safety

- **No Data Modification**: Original names in database remain unchanged
- **Display-Only**: Filtering happens only at display time
- **User Privacy**: Users can still see their own names uncensored in settings (if we add that feature)
- **Reporting**: Consider adding a "Report Username" feature for edge cases

## Future Enhancements

Consider adding:
- [ ] More sophisticated pattern matching (leetspeak: "f4gg0t")
- [ ] Context-aware filtering (allow "Dick" as a name)
- [ ] Admin dashboard to manage word list
- [ ] User reporting system for offensive names
- [ ] Automatic flagging for manual review
- [ ] Language-specific filters (support multiple languages)

## Testing Checklist

- [x] Common profanity is censored
- [x] Case-insensitive filtering works
- [x] Partial word matching works
- [x] Empty/all-censored names show as "Anonymous"
- [x] Long names are truncated properly
- [x] Clean names pass through unchanged
- [x] Performance is not impacted
- [x] Leaderboard displays filtered names correctly

## Notes

- Filter runs client-side for performance
- Word list is comprehensive but not exhaustive
- Consider server-side validation during signup as well
- Update word list periodically based on reports
- Balance between over-filtering and under-filtering

