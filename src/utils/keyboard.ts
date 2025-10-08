import { Keyboard, TextInput } from 'react-native';
import { SearchBarHandle } from '../components/SearchBar';

/**
 * Dismisses keyboard and blurs the search input in a race-condition-safe way.
 * Uses requestAnimationFrame to ensure state updates happen cleanly.
 * 
 * @param inputRef - Ref to SearchBar or TextInput component
 * 
 * @example
 * const searchRef = useRef<SearchBarHandle>(null);
 * dismissSearch(searchRef);
 */
export const dismissSearch = (
  inputRef?: React.RefObject<any>
) => {
  requestAnimationFrame(() => {
    if (inputRef?.current) {
      if ('blur' in inputRef.current && typeof inputRef.current.blur === 'function') {
        inputRef.current.blur();
      }
    }
    Keyboard.dismiss();
  });
};

/**
 * Check if keyboard is currently visible.
 * Note: This is a helper for gesture thresholds; actual visibility
 * should be tracked via Keyboard.addListener in components.
 */
export const isKeyboardVisible = (() => {
  let visible = false;
  
  Keyboard.addListener('keyboardDidShow', () => {
    visible = true;
  });
  
  Keyboard.addListener('keyboardDidHide', () => {
    visible = false;
  });
  
  return () => visible;
})();
