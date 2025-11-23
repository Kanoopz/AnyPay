import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { initNFC } from '@/services/nfc-service'
import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import { Alert, Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface SendDataScreenProps {
  onBack: () => void
}

type SendDataStep = 'input' | 'waiting_nfc'

export default function SendDataScreen({ onBack }: SendDataScreenProps) {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<SendDataStep>('input')
  const [number, setNumber] = useState('') // Numbers only
  const [nfcSupported, setNfcSupported] = useState(false)
  const [isNfcReading, setIsNfcReading] = useState(false)
  const [hceSession, setHceSession] = useState<any | null>(null)

  const pulseAnim = React.useRef(new Animated.Value(1)).current
  const hceSessionRef = React.useRef<any | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    hceSessionRef.current = hceSession
  }, [hceSession])

  // Initialize NFC on mount
  useEffect(() => {
    const initializeNFC = async () => {
      if (Platform.OS === 'android') {
        const supported = await initNFC()
        setNfcSupported(supported)
      }
    }
    initializeNFC()

    return () => {
      const cleanup = async () => {
        try {
          console.log('🧹 [Send] Cleaning up on unmount...')
          const { stopHceOperation, stopNfcReading } = await import('@/services/nfc-service')
          // Use ref to get latest session value
          const currentSession = hceSessionRef.current
          if (currentSession) {
            await stopHceOperation(currentSession)
          }
          await stopNfcReading()
          setStep('input')
          setIsNfcReading(false)
          console.log('✅ [Send] Cleanup complete')
        } catch (error) {
          console.error('❌ [Send] Cleanup error:', error)
        }
      }
      cleanup()
    }
  }, [])

  // Pulse animation when waiting for NFC
  useEffect(() => {
    if (step === 'waiting_nfc') {
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
  }, [step])

  const handleReceivePayment = async () => {
    // Validate number field
    if (!number.trim()) {
      Alert.alert('Error', 'Please enter a number')
      return
    }

    // Validate number is numbers only
    if (!/^\d+$/.test(number.trim())) {
      Alert.alert('Error', 'Please enter numbers only')
      return
    }

    if (!nfcSupported) {
      Alert.alert('NFC Not Available', 'NFC is not supported on this device')
      return
    }

    if (isNfcReading) {
      Alert.alert('NFC Busy', 'NFC is already active. Please wait.')
      return
    }

    // Move to waiting step
    setStep('waiting_nfc')
    setIsNfcReading(true)

    // Combine hardcoded strings with user input: optimism, usdc, address, number
    const combinedData = `optimism\nusdc\n0x2dD6B1B4E37054fed6cC937f51546eFA31c8F615\n${number.trim()}`

    // Initialize HCE to share the data
    try {
      const { initHCE, handleReceive, stopHceOperation } = await import('@/services/nfc-service')
      const hceSession = await initHCE()
      
      if (!hceSession) {
        Alert.alert('HCE Not Available', 'Host Card Emulation is not available')
        setStep('input')
        setIsNfcReading(false)
        return
      }

      // Store session for cleanup
      setHceSession(hceSession)

      // Share data via HCE
      handleReceive(
        hceSession,
        combinedData,
        () => {
          // Data was successfully read by receiving device
          console.log('✅ Data shared successfully via HCE')
          setStep('input')
          setIsNfcReading(false)
          stopHceOperation(hceSession)
          setHceSession(null)
          // Show alert on SENDING device
          Alert.alert('Success', `Payment details sent through NFC:\n1: optimism\n2: usdc\n3: 0x2dD6B1B4E37054fed6cC937f51546eFA31c8F615\n4: ${number}`)
        },
        async (error: string) => {
          console.error('❌ HCE send error:', error)
          setStep('input')
          setIsNfcReading(false)
          await stopHceOperation(hceSession)
          setHceSession(null)
          Alert.alert('Send Failed', `Failed to send data: ${error}`)
        }
      )
    } catch (error) {
      console.error('❌ Error initializing HCE:', error)
      setStep('input')
      setIsNfcReading(false)
      Alert.alert('Error', 'Failed to initialize NFC sharing')
    }
  }

  const handleCancel = async () => {
    try {
      console.log('🛑 [Send] STOPPING process immediately...')
      // Immediately update state to prevent any further operations
      setStep('input')
      setIsNfcReading(false)
      
      // Force stop all NFC operations
      const { stopHceOperation, stopNfcReading } = await import('@/services/nfc-service')
      
      // Stop HCE session
      const currentSession = hceSessionRef.current
      if (currentSession) {
        try {
          await stopHceOperation(currentSession)
        } catch (e) {
          console.error('Error stopping HCE:', e)
        }
        setHceSession(null)
        hceSessionRef.current = null
      }
      
      // Stop NFC reading
      try {
        await stopNfcReading()
      } catch (e) {
        console.error('Error stopping NFC reading:', e)
      }
      
      console.log('✅ [Send] Process stopped successfully')
    } catch (error) {
      console.error('❌ [Send] Stop error:', error)
      // Force state reset even on error
      setStep('input')
      setIsNfcReading(false)
      setHceSession(null)
      hceSessionRef.current = null
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.backgroundBlur} />

      <View style={styles.header}>
        <TouchableOpacity 
          onPress={async () => {
            // Clean up before going back
            await handleCancel()
            onBack()
          }} 
          style={styles.backButton} 
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#f3f4f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Payment</Text>
        <View style={styles.placeholder} />
      </View>

      {step === 'input' && (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount to Send</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <Input
                  style={styles.amountInput}
                  value={number}
                  onChangeText={setNumber}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <Card style={styles.infoCard}>
                <CardContent>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Receive Type</Text>
                      <Text style={styles.infoValue}>crypto</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Network</Text>
                      <Text style={styles.infoValue}>optimism</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Token</Text>
                      <Text style={styles.infoValue}>usdc</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </View>
          </ScrollView>

          <Button
            onPress={handleReceivePayment}
            disabled={!number.trim() || !nfcSupported}
            style={[styles.confirmButton, (!number.trim() || !nfcSupported) && styles.disabledButton]}
          >
            <Text style={styles.confirmButtonText}>Receive Payment</Text>
          </Button>
        </>
      )}

      {step === 'waiting_nfc' && (
        <>
          <View style={styles.content}>
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
              <Text style={styles.title}>Waiting for Payment</Text>
              <Text style={styles.amountDisplay}>${number}</Text>
              <Text style={styles.hint}>Hold sender's phone near your device...</Text>
            </View>
          </View>

          <Button onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Button>
        </>
      )}
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
    left: 0,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  amountContainer: {
    flex: 1,
    gap: 32,
    marginTop: 32,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  currencySymbol: {
    position: 'absolute',
    left: 24,
    fontSize: 36,
    fontWeight: 'bold',
    color: '#a855f7',
    zIndex: 1,
  },
  amountInput: {
    paddingLeft: 64,
    height: 64,
    fontSize: 36,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#f3f4f6',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '45%',
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    textTransform: 'capitalize',
  },
  addressValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    textTransform: 'none',
  },
  confirmButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#a855f7',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  amountDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f3f4f6',
  },
  hint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
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
  dataPreviewContainer: {
    marginTop: 12,
    gap: 8,
    alignItems: 'center',
  },
  dataPreview: {
    fontSize: 14,
    color: '#a855f7',
    textAlign: 'center',
    fontStyle: 'italic',
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

