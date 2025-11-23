import { Button } from '@/components/ui/button'
import { initNFC } from '@/services/nfc-service'
import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import { Alert, Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface SendDataScreenProps {
  onBack: () => void
}

export default function SendDataScreen({ onBack }: SendDataScreenProps) {
  const insets = useSafeAreaInsets()
  const [string1, setString1] = useState('') // Letters
  const [string2, setString2] = useState('') // Letters
  const [string3, setString3] = useState('') // Numbers
  const [isSending, setIsSending] = useState(false)
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
          setIsSending(false)
          setIsNfcReading(false)
          console.log('✅ [Send] Cleanup complete')
        } catch (error) {
          console.error('❌ [Send] Cleanup error:', error)
        }
      }
      cleanup()
    }
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
    // Validate all fields
    if (!string1.trim() || !string2.trim() || !string3.trim()) {
      Alert.alert('Error', 'Please fill in all three fields')
      return
    }

    // Validate string3 is numbers only
    if (!/^\d+$/.test(string3.trim())) {
      Alert.alert('Error', 'String 3 must contain only numbers')
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

    // Combine all strings into a single payload with newline delimiter
    const combinedData = `${string1.trim()}\n${string2.trim()}\n${string3.trim()}`

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
        combinedData,
        () => {
          // Data was successfully read by receiving device
          console.log('✅ Data shared successfully via HCE')
          setIsSending(false)
          setIsNfcReading(false)
          stopHceOperation(hceSession)
          setHceSession(null)
          // Show alert on SENDING device
          Alert.alert('Success', `Data sent through NFC:\nString 1: ${string1}\nString 2: ${string2}\nString 3: ${string3}`)
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
      console.log('🛑 [Send] STOPPING process immediately...')
      // Immediately update state to prevent any further operations
      setIsSending(false)
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
      setIsSending(false)
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
        <Text style={styles.headerTitle}>Send Data</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {!isSending ? (
          <>
            <View style={styles.inputsContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>String 1</Text>
                <TextInput
                  style={styles.textInput}
                  value={string1}
                  onChangeText={setString1}
                  placeholder="Enter string 1..."
                  placeholderTextColor="#9ca3af"
                  editable={!isSending}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>String 2</Text>
                <TextInput
                  style={styles.textInput}
                  value={string2}
                  onChangeText={setString2}
                  placeholder="Enter string 2..."
                  placeholderTextColor="#9ca3af"
                  editable={!isSending}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>String 3 (Numbers Only)</Text>
                <TextInput
                  style={styles.textInput}
                  value={string3}
                  onChangeText={setString3}
                  placeholder="Enter numbers only..."
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  editable={!isSending}
                />
              </View>
            </View>

            <Button
              onPress={handleSend}
              disabled={!string1.trim() || !string2.trim() || !string3.trim() || !nfcSupported}
              style={[styles.sendButton, (!string1.trim() || !string2.trim() || !string3.trim() || !nfcSupported) && styles.disabledButton]}
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
              <View style={styles.dataPreviewContainer}>
                <Text style={styles.dataPreview}>String 1: "{string1}"</Text>
                <Text style={styles.dataPreview}>String 2: "{string2}"</Text>
                <Text style={styles.dataPreview}>String 3: "{string3}"</Text>
              </View>
            </View>

            <Button onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Stop Process</Text>
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
  inputsContainer: {
    width: '100%',
    gap: 16,
  },
  inputContainer: {
    width: '100%',
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  textInput: {
    width: '100%',
    minHeight: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#f3f4f6',
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

