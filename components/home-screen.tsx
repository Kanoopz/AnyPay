import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Button } from '@/components/ui/button'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GradientText from '@/components/gradient-text'

interface HomeScreenProps {
  onSendClick: () => void
  onReceiveClick: () => void
  onSettingsClick: () => void
  onSendDataClick: () => void
  onReceiveDataClick: () => void
}

export default function HomeScreen({ onSendClick, onReceiveClick, onSettingsClick, onSendDataClick, onReceiveDataClick }: HomeScreenProps) {
  const insets = useSafeAreaInsets()
  const pulseAnim = React.useRef(new Animated.Value(1)).current

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.backgroundBlur1} />
      <View style={styles.backgroundBlur2} />

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={onSettingsClick}
        activeOpacity={0.7}
      >
        <View style={styles.settingsButtonInner}>
          <Ionicons name="settings" size={24} color="#f3f4f6" />
        </View>
      </TouchableOpacity>

      <View style={styles.header}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#a855f7', '#7f1d1d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          />
        </Animated.View>
        <GradientText style={styles.title}>Crypto Pay</GradientText>
        <GradientText style={styles.subtitle}>Instant NFC Payments</GradientText>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onSendClick}
          activeOpacity={0.8}
        >
          <View style={styles.actionButtonContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="paper-plane" size={24} color="#ffffff" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Send Crypto</Text>
              <Text style={styles.actionSubtitle}>Tap to initiate payment</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onReceiveClick}
          activeOpacity={0.8}
        >
          <View style={styles.actionButtonContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="download" size={24} color="#ffffff" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Receive Payment</Text>
              <Text style={styles.actionSubtitle}>Set amount and wait</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onSendDataClick}
          activeOpacity={0.8}
        >
          <View style={styles.actionButtonContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="send" size={24} color="#ffffff" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Send Data</Text>
              <Text style={styles.actionSubtitle}>Send string via NFC</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onReceiveDataClick}
          activeOpacity={0.8}
        >
          <View style={styles.actionButtonContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="document-text" size={24} color="#ffffff" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Receive Data</Text>
              <Text style={styles.actionSubtitle}>Receive string via NFC</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Hold your phone near NFC reader to complete transaction
        </Text>
        <View style={styles.statusContainer}>
          <Animated.View
            style={[
              styles.statusDot,
              {
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: [0.5, 1],
                }),
              },
            ]}
          />
          <Text style={styles.statusText}>Ready</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0818',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  backgroundBlur1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 384,
    height: 384,
    backgroundColor: '#a855f7',
    borderRadius: 192,
    opacity: 0.3,
  },
  backgroundBlur2: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 384,
    height: 384,
    backgroundColor: '#c1305e',
    borderRadius: 192,
    opacity: 0.3,
  },
  settingsButton: {
    position: 'absolute',
    top: 32,
    right: 24,
    zIndex: 10,
  },
  settingsButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  actionButton: {
    width: '100%',
    height: 112,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(15, 8, 24, 0.3)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 8, 24, 0.6)',
  },
  actionButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f3f4f6',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#f3f4f6',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    color: '#9ca3af',
  },
})

