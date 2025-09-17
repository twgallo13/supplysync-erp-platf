/**
 * Haptic Feedback Utility for Mobile Devices
 * Provides standardized haptic feedback patterns for different user interactions
 */

// Define haptic patterns for different interaction types
export enum HapticPattern {
  SUCCESS = 'success',
  ERROR = 'error', 
  WARNING = 'warning',
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SELECT = 'select',
  SCAN_SUCCESS = 'scan_success',
  SCAN_ERROR = 'scan_error'
}

// Check if device supports haptic feedback
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator || 'hapticFeedback' in navigator
}

// Check if device supports advanced haptic feedback (iOS)
export function isAdvancedHapticSupported(): boolean {
  // Check for Taptic Engine support (iOS Safari)
  return 'ontouchstart' in window && /iPhone|iPad|iPod/.test(navigator.userAgent)
}

/**
 * Trigger haptic feedback based on pattern type
 */
export function triggerHaptic(pattern: HapticPattern): void {
  if (!isHapticSupported()) {
    console.debug('Haptic feedback not supported on this device')
    return
  }

  try {
    // Try advanced haptic feedback first (iOS Taptic Engine)
    if (isAdvancedHapticSupported() && 'webkitTapticEngine' in window) {
      triggerAdvancedHaptic(pattern)
      return
    }

    // Fall back to standard vibration API
    triggerStandardVibration(pattern)
  } catch (error) {
    console.debug('Haptic feedback failed:', error)
  }
}

/**
 * Advanced haptic feedback for iOS devices with Taptic Engine
 */
function triggerAdvancedHaptic(pattern: HapticPattern): void {
  // Note: This is a conceptual implementation
  // Real iOS haptic feedback would require native bridge or specialized library
  const tapticEngine = (window as any).webkitTapticEngine
  
  if (!tapticEngine) {
    triggerStandardVibration(pattern)
    return
  }

  switch (pattern) {
    case HapticPattern.SUCCESS:
    case HapticPattern.SCAN_SUCCESS:
      // Success notification haptic (light tap)
      tapticEngine.notification('success')
      break
    case HapticPattern.ERROR:
    case HapticPattern.SCAN_ERROR:
      // Error notification haptic (triple tap)
      tapticEngine.notification('error')
      break
    case HapticPattern.WARNING:
      // Warning notification haptic (double tap)
      tapticEngine.notification('warning')
      break
    case HapticPattern.LIGHT:
    case HapticPattern.SELECT:
      // Light impact haptic
      tapticEngine.impact('light')
      break
    case HapticPattern.MEDIUM:
      // Medium impact haptic
      tapticEngine.impact('medium')
      break
    case HapticPattern.HEAVY:
      // Heavy impact haptic
      tapticEngine.impact('heavy')
      break
    default:
      tapticEngine.impact('light')
  }
}

/**
 * Standard vibration patterns for Android and other devices
 */
function triggerStandardVibration(pattern: HapticPattern): void {
  if (!('vibrate' in navigator)) {
    return
  }

  let vibrationPattern: number | number[]

  switch (pattern) {
    case HapticPattern.SUCCESS:
      // Short success pulse
      vibrationPattern = [50]
      break
    case HapticPattern.SCAN_SUCCESS:
      // Double pulse for successful scan
      vibrationPattern = [50, 50, 50]
      break
    case HapticPattern.ERROR:
      // Triple pulse for error
      vibrationPattern = [100, 50, 100, 50, 100]
      break
    case HapticPattern.SCAN_ERROR:
      // Long pulse for scan error
      vibrationPattern = [200]
      break
    case HapticPattern.WARNING:
      // Double pulse for warning
      vibrationPattern = [75, 50, 75]
      break
    case HapticPattern.LIGHT:
    case HapticPattern.SELECT:
      // Very short light pulse
      vibrationPattern = [25]
      break
    case HapticPattern.MEDIUM:
      // Medium pulse
      vibrationPattern = [50]
      break
    case HapticPattern.HEAVY:
      // Heavy pulse
      vibrationPattern = [100]
      break
    default:
      vibrationPattern = [25]
  }

  navigator.vibrate(vibrationPattern)
}

/**
 * Convenience functions for common haptic patterns
 */
export const haptics = {
  success: () => triggerHaptic(HapticPattern.SUCCESS),
  error: () => triggerHaptic(HapticPattern.ERROR),
  warning: () => triggerHaptic(HapticPattern.WARNING),
  light: () => triggerHaptic(HapticPattern.LIGHT),
  medium: () => triggerHaptic(HapticPattern.MEDIUM),
  heavy: () => triggerHaptic(HapticPattern.HEAVY),
  select: () => triggerHaptic(HapticPattern.SELECT),
  scanSuccess: () => triggerHaptic(HapticPattern.SCAN_SUCCESS),
  scanError: () => triggerHaptic(HapticPattern.SCAN_ERROR)
}

/**
 * Settings for user preference management
 */
export interface HapticSettings {
  enabled: boolean
  intensity: 'light' | 'medium' | 'heavy'
}

export const DEFAULT_HAPTIC_SETTINGS: HapticSettings = {
  enabled: true,
  intensity: 'medium'
}

/**
 * Get haptic settings from localStorage
 */
export function getHapticSettings(): HapticSettings {
  try {
    const stored = localStorage.getItem('supplysync-haptic-settings')
    if (stored) {
      return { ...DEFAULT_HAPTIC_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.debug('Failed to load haptic settings:', error)
  }
  return DEFAULT_HAPTIC_SETTINGS
}

/**
 * Save haptic settings to localStorage
 */
export function saveHapticSettings(settings: HapticSettings): void {
  try {
    localStorage.setItem('supplysync-haptic-settings', JSON.stringify(settings))
  } catch (error) {
    console.debug('Failed to save haptic settings:', error)
  }
}

/**
 * Trigger haptic with user preference consideration
 */
export function triggerHapticWithSettings(pattern: HapticPattern): void {
  const settings = getHapticSettings()
  
  if (!settings.enabled) {
    return
  }

  // Adjust pattern intensity based on user preference
  let adjustedPattern = pattern
  if (settings.intensity === 'light' && pattern === HapticPattern.HEAVY) {
    adjustedPattern = HapticPattern.MEDIUM
  } else if (settings.intensity === 'heavy' && pattern === HapticPattern.LIGHT) {
    adjustedPattern = HapticPattern.MEDIUM
  }

  triggerHaptic(adjustedPattern)
}