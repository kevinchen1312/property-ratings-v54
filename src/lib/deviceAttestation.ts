/**
 * Device Attestation / Fingerprinting
 * Collects device information to detect emulators, tampering, and suspicious patterns
 */

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export interface DeviceFingerprint {
  // Platform info
  platform: 'ios' | 'android' | 'web';
  osName: string | null;
  osVersion: string | null;
  
  // Device info
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  deviceName: string | null;
  deviceType: Device.DeviceType | null;
  
  // App info
  appVersion: string | null;
  buildVersion: string | null;
  bundleId: string | null;
  
  // Integrity checks
  isDevice: boolean;
  isEmulator: boolean | null;
  isRooted: boolean | null; // Android only
  
  // Timestamps
  timestamp: number;
}

/**
 * Collect comprehensive device fingerprint
 */
export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const fingerprint: DeviceFingerprint = {
    platform: Platform.OS as 'ios' | 'android' | 'web',
    osName: Device.osName,
    osVersion: Device.osVersion,
    
    brand: Device.brand,
    manufacturer: Device.manufacturer,
    modelName: Device.modelName,
    deviceName: Device.deviceName || null,
    deviceType: Device.deviceType,
    
    appVersion: Application.nativeApplicationVersion,
    buildVersion: Application.nativeBuildVersion,
    bundleId: Application.applicationId,
    
    isDevice: Device.isDevice,
    isEmulator: await detectEmulator(),
    isRooted: await detectRootJailbreak(),
    
    timestamp: Date.now(),
  };
  
  return fingerprint;
}

/**
 * Detect if running in an emulator/simulator
 */
async function detectEmulator(): Promise<boolean> {
  // Basic check: is this a physical device?
  if (!Device.isDevice) {
    return true;
  }
  
  // iOS: Check for common simulator model names
  if (Platform.OS === 'ios') {
    const model = Device.modelName?.toLowerCase() || '';
    if (model.includes('simulator')) {
      return true;
    }
  }
  
  // Android: Check for common emulator characteristics
  if (Platform.OS === 'android') {
    const brand = Device.brand?.toLowerCase() || '';
    const manufacturer = Device.manufacturer?.toLowerCase() || '';
    const model = Device.modelName?.toLowerCase() || '';
    
    // Common emulator indicators
    if (brand === 'google' && model.includes('sdk')) return true;
    if (manufacturer === 'genymotion') return true;
    if (model.includes('emulator')) return true;
    if (brand === 'generic') return true;
  }
  
  return false;
}

/**
 * Detect if device is rooted (Android) or jailbroken (iOS)
 * Note: This is a basic check. Full detection requires native code.
 */
async function detectRootJailbreak(): Promise<boolean | null> {
  if (Platform.OS === 'web') return null;
  
  // This is a placeholder - proper detection requires native modules
  // For now, we'll return null (unknown) and rely on other signals
  
  // TODO: Implement with react-native-root-detection or similar
  return null;
}

/**
 * Generate a hash of the device fingerprint for server-side verification
 */
export function hashFingerprint(fingerprint: DeviceFingerprint): string {
  const data = JSON.stringify({
    platform: fingerprint.platform,
    osVersion: fingerprint.osVersion,
    modelName: fingerprint.modelName,
    bundleId: fingerprint.bundleId,
    isDevice: fingerprint.isDevice,
  });
  
  // Simple hash (in production, use a crypto library)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Check if device fingerprint indicates high risk
 */
export function isHighRiskDevice(fingerprint: DeviceFingerprint): boolean {
  // Emulator detected
  if (fingerprint.isEmulator) return true;
  
  // Not a physical device
  if (!fingerprint.isDevice) return true;
  
  // Rooted/jailbroken (if detected)
  if (fingerprint.isRooted === true) return true;
  
  return false;
}

/**
 * Get a simple device attestation token
 * This is NOT cryptographically secure like Apple App Attest,
 * but provides reasonable fraud detection
 */
export async function getDeviceAttestationToken(): Promise<string> {
  const fingerprint = await generateDeviceFingerprint();
  const hash = hashFingerprint(fingerprint);
  
  // Encode fingerprint + hash as base64 token
  const payload = {
    fp: fingerprint,
    h: hash,
    ts: Date.now(),
  };
  
  // In a real implementation, you'd sign this with a secret key
  // For now, we'll just base64 encode it
  const token = btoa(JSON.stringify(payload));
  
  return token;
}
