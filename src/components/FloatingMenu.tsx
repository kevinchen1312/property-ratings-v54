import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { GlobalFonts } from '../styles/global';

const { width, height } = Dimensions.get('window');

interface FloatingMenuProps {
  credits: number;
  onBuyCredits: () => void;
  onEarnings: () => void;
  onAnalytics: () => void;
  onSettings: () => void;
  onRewards: () => void;
  onMenuVisibilityChange?: (visible: boolean) => void;
  isScreenFocused?: boolean;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  credits,
  onBuyCredits,
  onEarnings,
  onAnalytics,
  onSettings,
  onRewards,
  onMenuVisibilityChange,
  isScreenFocused = true,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  const openMenu = () => {
    // Set scale to 1 immediately for instant appearance
    scaleAnim.setValue(1);
    setMenuVisible(true);
    onMenuVisibilityChange?.(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    onMenuVisibilityChange?.(false);
    // Reset animation to 0 after closing
    setTimeout(() => {
      scaleAnim.setValue(0);
    }, 100);
  };

  const handleMenuAction = (action: () => void) => {
    console.log('FloatingMenu: Menu action triggered');
    // Close menu and navigate
    closeMenu();
    action();
  };

  // Calculate badge width based on number of digits
  const creditString = credits.toString();
  const digitCount = creditString.length;
  const badgeWidth = digitCount === 1 ? 24 : Math.max(24, 12 + digitCount * 8);

  return (
    <>
      {/* Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={openMenu}
        activeOpacity={0.8}
      >
        <Text style={styles.menuIcon}>☰</Text>
        
        {/* Credit Badge */}
        <View style={[styles.creditBadge, { width: badgeWidth }]}>
          <Text style={styles.creditText} numberOfLines={1}>
            {credits}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Menu Overlay */}
      <Modal
        visible={menuVisible && isScreenFocused}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          {/* White Modal Container */}
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: scaleAnim,
              },
            ]}
          >
            {/* Buy Credits */}
            <TouchableOpacity
              style={[styles.verticalButton, styles.buyCreditsButton]}
              onPress={() => handleMenuAction(onBuyCredits)}
              activeOpacity={0.8}
            >
              <Text style={styles.menuItemText}>Buy Credits</Text>
            </TouchableOpacity>

            {/* Earnings */}
            <TouchableOpacity
              style={[styles.verticalButton, styles.earningsButton]}
              onPress={() => handleMenuAction(onEarnings)}
              activeOpacity={0.8}
            >
              <Text style={styles.menuItemText}>Earnings</Text>
            </TouchableOpacity>

            {/* Analytics */}
            <TouchableOpacity
              style={[styles.verticalButton, styles.analyticsButton]}
              onPress={() => handleMenuAction(onAnalytics)}
              activeOpacity={0.8}
            >
              <Text style={styles.menuItemText}>Analytics</Text>
            </TouchableOpacity>

            {/* Rewards */}
            <TouchableOpacity
              style={[styles.verticalButton, styles.rewardsButton]}
              onPress={() => handleMenuAction(onRewards)}
              activeOpacity={0.8}
            >
              <Text style={styles.menuItemText}>Rewards</Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              style={[styles.verticalButton, styles.settingsButton]}
              onPress={() => handleMenuAction(onSettings)}
              activeOpacity={0.8}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
  },
  creditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  creditText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 180,
    width: 340,
    height: 380,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    padding: 16,
    justifyContent: 'space-between',
  },
  verticalButton: {
    width: '100%',
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buyCreditsButton: {
    backgroundColor: '#7C3AED',
  },
  earningsButton: {
    backgroundColor: '#000000',
  },
  analyticsButton: {
    backgroundColor: '#7C3AED',
  },
  rewardsButton: {
    backgroundColor: '#000000',
  },
  settingsButton: {
    backgroundColor: '#7C3AED',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    textAlign: 'center',
    lineHeight: 24,
    includeFontPadding: false,
  },
});

