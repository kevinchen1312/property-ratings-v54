import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlobalFonts } from '../styles/global';
import { playNoteInterval } from '../services/noteSound';

interface StarRatingProps {
  label: string;
  rating: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  label,
  rating,
  onRatingChange,
  disabled = false,
}) => {
  const handleStarPress = async (starValue: number) => {
    if (disabled) return;
    
    // Toggle logic:
    // - If no rating selected (rating === 0), set the new rating
    // - If clicking the same star value as current rating, remove rating (set to 0)
    // - If clicking a different star value, update to new rating
    if (rating === starValue) {
      // Clicking the same star - remove rating
      onRatingChange(0);
    } else {
      // Clicking a different star or no rating selected - set new rating
      onRatingChange(starValue);
      // Play the corresponding musical interval
      await playNoteInterval(starValue);
    }
  };

  const renderNotes = () => {
    const notes = [];
    for (let i = 1; i <= 5; i++) {
      notes.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.note, 
            disabled && styles.disabledNote,
            i === rating && rating > 0 && styles.currentRatingNote
          ]}
          onPress={() => handleStarPress(i)}
          disabled={disabled}
        >
          <Text style={[styles.noteText, i <= rating && styles.selectedNote]}>
            ♪
          </Text>
        </TouchableOpacity>
      );
    }
    return notes;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.notesContainer}>
        {renderNotes()}
        <Text style={styles.ratingText}>
          {rating === 0 ? '(Not rated)' : `(${rating}/5)`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  note: {
    marginRight: 8,
    padding: 4,
  },
  disabledNote: {
    opacity: 0.5,
  },
  noteText: {
    fontSize: 28,
    color: '#D1D5DB',
  },
  selectedNote: {
    color: '#7C3AED',
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    fontWeight: '500',
  },
  currentRatingNote: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
});
