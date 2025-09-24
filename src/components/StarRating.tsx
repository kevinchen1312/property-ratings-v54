import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
  const handleStarPress = (starValue: number) => {
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
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.star, 
            disabled && styles.disabledStar,
            i === rating && rating > 0 && styles.currentRatingStar
          ]}
          onPress={() => handleStarPress(i)}
          disabled={disabled}
        >
          <Text style={[styles.starText, i <= rating && styles.selectedStar]}>
            ⭐
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.starsContainer}>
        {renderStars()}
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
    color: '#333',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 8,
    padding: 4,
  },
  disabledStar: {
    opacity: 0.5,
  },
  starText: {
    fontSize: 24,
    opacity: 0.3,
  },
  selectedStar: {
    opacity: 1,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  currentRatingStar: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
});
