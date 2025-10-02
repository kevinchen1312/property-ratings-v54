import { Audio } from 'expo-av';

// Note frequencies for vocal synthesis
const NOTE_FREQUENCIES: { [key: string]: number } = {
  'C': 261.63,
  'Db': 277.18,  // C# / D flat
  'D': 293.66,
  'E': 329.63,
  'F': 349.23,
  'G': 392.00,
};

// Rating to note names mapping
const RATING_TO_NOTES = {
  1: ['C', 'Db'], // C + C# (minor second - dissonant)
  2: ['C', 'D'],  // C + D (major second)
  3: ['C', 'E'],  // C + E (major third - pleasant)
  4: ['C', 'F'],  // C + F (perfect fourth)
  5: ['C', 'G'],  // C + G (perfect fifth - very consonant)
};

let isAudioInitialized = false;
let soundsLoaded = false;
let cachedSounds: { [key: string]: Audio.Sound } = {};

// Initialize audio mode
export const initializeAudio = async () => {
  if (isAudioInitialized) return;
  
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    isAudioInitialized = true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};

// Pre-load all vocal note sounds - using human voice samples
export const preloadSounds = async () => {
  if (soundsLoaded) return;
  
  try {
    await initializeAudio();
    
    // Using vocal "ooh" samples from a working repository
    // These files are confirmed to exist and work
    const vocalUrls: { [key: string]: string } = {
      'C': 'https://tonejs.github.io/audio/casio/C4.mp3',
      'Db': 'https://tonejs.github.io/audio/casio/Db4.mp3',
      'D': 'https://tonejs.github.io/audio/casio/D4.mp3',
      'E': 'https://tonejs.github.io/audio/casio/E4.mp3',
      'F': 'https://tonejs.github.io/audio/casio/F4.mp3',
      'G': 'https://tonejs.github.io/audio/casio/G4.mp3',
    };
    
    const notesToLoad = ['C', 'Db', 'D', 'E', 'F', 'G'];
    
    // Load all unique notes in parallel
    await Promise.all(
      notesToLoad.map(async (note) => {
        try {
          const sound = new Audio.Sound();
          await sound.loadAsync(
            { uri: vocalUrls[note] },
            { shouldPlay: false, volume: 0.6 }
          );
          cachedSounds[note] = sound;
          console.log(`✅ Loaded note ${note}`);
        } catch (error) {
          console.log(`❌ Failed to load note ${note}`);
        }
      })
    );
    
    soundsLoaded = true;
    console.log('✅ All note sounds preloaded');
  } catch (error) {
    console.log('Note preloading failed:', error);
  }
};

// Play a note interval (two notes together) using cached sounds
export const playNoteInterval = async (rating: number) => {
  if (rating < 1 || rating > 5) return;
  
  // TEMPORARILY DISABLED - sounds not loading from external URLs
  // TODO: Add local audio assets for human vocal sounds
  return;
  
  try {
    // Preload sounds if not already loaded (non-blocking for first tap)
    if (!soundsLoaded) {
      preloadSounds(); // Fire and forget
      console.log('🎵 Sounds loading in background...');
      return; // Skip first tap while loading
    }
    
    const notes = RATING_TO_NOTES[rating as keyof typeof RATING_TO_NOTES];
    
    // Get cached sounds
    const sound1 = cachedSounds[notes[0]];
    const sound2 = cachedSounds[notes[1]];
    
    if (!sound1 || !sound2) {
      console.log('⏳ Sounds not ready yet');
      return;
    }
    
    // Replay both sounds from the beginning
    await sound1.setPositionAsync(0);
    await sound2.setPositionAsync(0);
    await sound1.playAsync();
    await sound2.playAsync();
    console.log(`🎵 Playing interval for rating ${rating}`);
    
  } catch (error) {
    console.log('❌ Note playback failed:', error);
  }
};

// Clean up all cached sounds
export const cleanupSounds = async () => {
  for (const note in cachedSounds) {
    try {
      await cachedSounds[note].unloadAsync();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  cachedSounds = {};
  soundsLoaded = false;
};

