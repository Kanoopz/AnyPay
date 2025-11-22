import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, TextInput, Alert, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui/button'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { initNFC, handlePay, stopNfcReading } from '@/services/nfc-service'

interface SendDataScreenProps {
  onBack: () => void
}

export default function SendDataScreen({ onBack }: SendDataScreenProps) {
  const insets = useSafeAreaInsets()
  const [dataToSend, setDataToSend] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(false)
  const [isNfcReading, setIsNfcReading] = useState(false)
  const [hceSession, setHceSession] = useState<any | null>(null)

  const pulseAnim = React.useRef(new Animated.Value(1)).current

  // Initialize NFC on mount
  useEffect(() => {
    const initializeNFC = async () => {
      if (Platform.OS === 'android') {
        const supported = await initNFC()
        setNfcSupported(supported)
      }
    }
    initializeNFC()
  }, [])

  // Pulse animation when sending
  useEffect(() => {
    if (isSending) {
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
  }, [isSending])

  const handleSend = async () => {
    if (!dataToSend.trim()) {
      Alert.alert('Error', 'Please enter a string to send')
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

    setIsSending(true)
    setIsNfcReading(true)

    // Initialize HCE to share the data
    try {
      const { initHCE, handleReceive, stopHceOperation } = await import('@/services/nfc-service')
      const hceSession = await initHCE()
      
      if (!hceSession) {
        Alert.alert('HCE Not Available', 'Host Card Emulation is not available')
        setIsSending(false)
        setIsNfcReading(false)
        return
      }

      // Store session for cleanup
      setHceSession(hceSession)

      // Share data via HCE
      handleReceive(
        hceSession,
        dataToSend,
        () => {
          // Data was successfully read by receiving device
          console.log('✅ Data shared successfully via HCE')
          setIsSending(false)
          setIsNfcReading(false)
          stopHceOperation(hceSession)
          setHceSession(null)
          // Show alert on SENDING device
          Alert.alert('Success', `String sent through NFC: ${dataToSend}`)
        },
        async (error: string) => {
          console.error('❌ HCE send error:', error)
          setIsSending(false)
          setIsNfcReading(false)
          await stopHceOperation(hceSession)
          setHceSession(null)
          Alert.alert('Send Failed', `Failed to send data: ${error}`)
        }
      )
    } catch (error) {
      console.error('❌ Error initializing HCE:', error)
      setIsSending(false)
      setIsNfcReading(false)
      Alert.alert('Error', 'Failed to initialize NFC sharing')
    }
  }

  const handleCancel = async () => {
    try {
      if (hceSession) {
        const { stopHceOperation } = await import('@/services/nfc-service')
        await stopHceOperation(hceSession)
        setHceSession(null)
      }
      setIsSending(false)
      setIsNfcReading(false)
    } catch (error) {
      setIsSending(false)
      setIsNfcReading(false)
      setHceSession(null)
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.backgroundBlur} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#f3f4f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Data</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {!isSending ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter string to send</Text>
              <TextInput
                style={styles.textInput}
                value={dataToSend}
                onChangeText={setDataToSend}
                placeholder="Type your message here..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                editable={!isSending}
              />
            </View>

            <Button
              onPress={handleSend}
              disabled={!dataToSend.trim() || !nfcSupported}
              style={[styles.sendButton, (!dataToSend.trim() || !nfcSupported) && styles.disabledButton]}
            >
              <Text style={styles.sendButtonText}>Send via NFC</Text>
            </Button>

            {!nfcSupported && (
              <Text style={styles.warningText}>
                ⚠️ NFC is not available on this device
              </Text>
            )}
          </>
        ) : (
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
              <Text style={styles.title}>Sending Data...</Text>
              <Text style={styles.subtitle}>Tap your phone near the receiving device</Text>
              <Text style={styles.dataPreview}>Sending: "{dataToSend}"</Text>
            </View>

            <Button onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Button>
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
    gap: 24,
  },
  inputContainer: {
    width: '100%',
    gap: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  textInput: {
    width: '100%',
    minHeight: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f3f4f6',
    textAlignVertical: 'top',
  },
  sendButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#a855f7',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  warningText: {
    fontSize: 14,
    color: '#fbbf24',
    textAlign: 'center',
    marginTop: 8,
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
  dataPreview: {
    fontSize: 16,
    color: '#a855f7',
    textAlign: 'center',
    marginTop: 8,
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

