import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui/button'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { stopHceOperation } from '@/services/nfc-service'

interface ReceiveDataScreenProps {
  onBack: () => void
}

export default function ReceiveDataScreen({ onBack }: ReceiveDataScreenProps) {
  const insets = useSafeAreaInsets()
  const [isReceiving, setIsReceiving] = useState(false)
  const [hceSupported, setHceSupported] = useState(false)
  const [isHceActive, setIsHceActive] = useState(false)
  const [session, setSession] = useState<any | null>(null)
  const [receivedData, setReceivedData] = useState<string | null>(null)
  const [isNfcReading, setIsNfcReading] = useState(false)

  const pulseAnim = React.useRef(new Animated.Value(1)).current

  // Initialize NFC on mount and auto-start receiving
  useEffect(() => {
    const initializeNFC = async () => {
      if (Platform.OS === 'android') {
        const { initNFC } = await import('@/services/nfc-service')
        const supported = await initNFC()
        setHceSupported(supported)
        // Auto-start receiving when component mounts
        if (supported) {
          // Small delay to ensure state is ready
          setTimeout(() => {
            startReceiving(null) // We don't need HCE session for reading
          }, 500)
        }
      }
    }
    initializeNFC()

    return () => {
      const cleanup = async () => {
        try {
          const { stopNfcReading, stopHceOperation } = await import('@/services/nfc-service')
          await stopNfcReading()
          if (session) {
            await stopHceOperation(session)
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      cleanup()
    }
  }, [])

  // Pulse animation when receiving
  useEffect(() => {
    if (isReceiving) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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
    } else {
      pulseAnim.setValue(1)
    }
  }, [isReceiving])

  const startReceiving = async (hceSession: any) => {
    if (isHceActive || isNfcReading) return

    setIsReceiving(true)
    setIsHceActive(true)
    setIsNfcReading(true)

    // Start NFC reading to receive data from sending device
    try {
      const { handlePay, stopNfcReading } = await import('@/services/nfc-service')
      
      handlePay(
        (receivedData: string) => {
          // Data received from sending device via NFC
          console.log('✅ Data received via NFC:', receivedData)
          setReceivedData(receivedData)
          setIsReceiving(false)
          setIsHceActive(false)
          setIsNfcReading(false)
          stopNfcReading()
          // Show alert on RECEIVING device
          Alert.alert('Data Received', `Data received: ${receivedData}`)
        },
        async (error: string) => {
          console.error('❌ NFC receive error:', error)
          setIsReceiving(false)
          setIsHceActive(false)
          setIsNfcReading(false)
          await stopNfcReading()
          Alert.alert('Receive Failed', `Failed to receive data: ${error}`)
        }
      )
    } catch (error) {
      console.error('❌ Error starting NFC reading:', error)
      setIsReceiving(false)
      setIsHceActive(false)
      setIsNfcReading(false)
      Alert.alert('Error', 'Failed to start NFC reading')
    }
  }

  const handleCancel = async () => {
    try {
      const { stopNfcReading } = await import('@/services/nfc-service')
      await stopNfcReading()
      if (session) {
        await stopHceOperation(session)
      }
      setIsReceiving(false)
      setIsHceActive(false)
      setIsNfcReading(false)
    } catch (error) {
      setIsReceiving(false)
      setIsHceActive(false)
      setIsNfcReading(false)
    }
  }


  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.backgroundBlur} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#f3f4f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Data</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {isReceiving ? (
          <>
            <Animated.View
              style={[
                styles.nfcIconContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.nfcIconGradient}>
                <Ionicons name="phone-portrait" size={64} color="#ffffff" />
              </View>
            </Animated.View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>Waiting for Data...</Text>
              <Text style={styles.subtitle}>Hold sender's phone near your device</Text>
            </View>

            <Button onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Button>
          </>
        ) : (
          <>
            {receivedData ? (
              <>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.successTitle}>Data Received!</Text>
                  <Text style={styles.receivedDataText}>{receivedData}</Text>
                </View>
                <Button
                  onPress={() => {
                    setReceivedData(null)
                    startReceiving(null)
                  }}
                  style={styles.receiveAgainButton}
                >
                  <Text style={styles.receiveAgainButtonText}>Receive Again</Text>
                </Button>
              </>
            ) : (
              <>
                <View style={styles.textContainer}>
                  <Text style={styles.title}>Ready to Receive</Text>
                  <Text style={styles.subtitle}>
                    {hceSupported
                      ? 'Tap the button below to start receiving data via NFC'
                      : 'NFC is not available on this device'}
                  </Text>
                </View>
                <Button
                  onPress={() => startReceiving(null)}
                  disabled={!hceSupported}
                  style={[styles.startButton, !hceSupported && styles.disabledButton]}
                >
                  <Text style={styles.startButtonText}>Start Receiving</Text>
                </Button>
              </>
            )}
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0818',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  backgroundBlur: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 384,
    height: 384,
    backgroundColor: '#a855f7',
    borderRadius: 192,
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f3f4f6',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 32,
  },
  nfcIconContainer: {
    width: 128,
    height: 128,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  nfcIconGradient: {
    flex: 1,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f3f4f6',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#d1d5db',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22c55e',
    textAlign: 'center',
  },
  receivedDataText: {
    fontSize: 18,
    color: '#a855f7',
    textAlign: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  successIconContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  startButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#a855f7',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  receiveAgainButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#a855f7',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiveAgainButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  cancelButton: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '600',
  },
  simulateButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  simulateButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
})

