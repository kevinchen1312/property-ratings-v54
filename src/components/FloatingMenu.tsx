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
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  credits,
  onBuyCredits,
  onEarnings,
  onAnalytics,
  onSettings,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  const openMenu = () => {
    setMenuVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const closeMenu = () => {
    Animated.spring(scaleAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start(() => setMenuVisible(false));
  };

  const handleMenuAction = (action: () => void) => {
    console.log('FloatingMenu: Menu action triggered');
    closeMenu();
    setTimeout(() => {
      console.log('FloatingMenu: Executing action after delay');
      action();
    }, 300);
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
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: scaleAnim,
              },
            ]}
          >
            <View style={styles.menuGrid}>
              {/* Buy Credits */}
              <TouchableOpacity
                style={[styles.menuItem, styles.buyCreditsButton]}
                onPress={() => handleMenuAction(onBuyCredits)}
                activeOpacity={0.8}
              >
                <Text style={styles.menuItemIcon}>💳</Text>
                <Text style={styles.menuItemText}>Buy{'\n'}Credits</Text>
              </TouchableOpacity>

              {/* Earnings */}
              <TouchableOpacity
                style={[styles.menuItem, styles.earningsButton]}
                onPress={() => handleMenuAction(onEarnings)}
                activeOpacity={0.8}
              >
                <Text style={styles.menuItemIcon}>💰</Text>
                <Text style={styles.menuItemText}>Earnings</Text>
              </TouchableOpacity>

              {/* Analytics */}
              <TouchableOpacity
                style={[styles.menuItem, styles.analyticsButton]}
                onPress={() => handleMenuAction(onAnalytics)}
                activeOpacity={0.8}
              >
                <Text style={styles.menuItemIcon}>📊</Text>
                <Text style={styles.menuItemText}>Analytics</Text>
              </TouchableOpacity>

              {/* Settings */}
              <TouchableOpacity
                style={[styles.menuItem, styles.settingsButton]}
                onPress={() => handleMenuAction(onSettings)}
                activeOpacity={0.8}
              >
                <Text style={styles.menuItemIcon}>⚙️</Text>
                <Text style={styles.menuItemText}>Settings</Text>
              </TouchableOpacity>
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeMenu}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>✕</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: width * 0.85,
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  menuItem: {
    width: '47%',
    aspectRatio: 1,
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
    backgroundColor: '#34C759',
  },
  earningsButton: {
    backgroundColor: '#FFD700',
  },
  analyticsButton: {
    backgroundColor: '#007AFF',
  },
  settingsButton: {
    backgroundColor: '#8E8E93',
  },
  menuItemIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 20,
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    fontFamily: GlobalFonts.regular,
  },
});

