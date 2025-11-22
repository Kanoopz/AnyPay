import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ReceivePaymentFlowProps {
  onBack: () => void
}

type ReceiveStep = 'amount' | 'waiting_nfc' | 'processing' | 'success'

export default function ReceivePaymentFlow({ onBack }: ReceivePaymentFlowProps) {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<ReceiveStep>('amount')
  const [amount, setAmount] = useState('')
  const [receiveType] = useState<'crypto' | 'fiat'>('crypto')

  const pulseAnim = React.useRef(new Animated.Value(1)).current
  const spinAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
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
    }
  }, [step])

  React.useEffect(() => {
    if (step === 'processing') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start()
    }
  }, [step])

  const handleConfirmAmount = () => {
    if (!amount) return
    setStep('waiting_nfc')
    setTimeout(() => {
      setStep('processing')
      setTimeout(() => {
        setStep('success')
      }, 2500)
    }, 3000)
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.backgroundBlur} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#f3f4f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Payment</Text>
        <View style={styles.placeholder} />
      </View>

      {step === 'amount' && (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount to Receive</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <Input
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
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
                      <Text style={styles.infoValue}>{receiveType}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Network</Text>
                      <Text style={styles.infoValue}>Polygon</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </View>
          </ScrollView>

          <Button
            onPress={handleConfirmAmount}
            disabled={!amount}
            style={[styles.confirmButton, !amount && styles.disabledButton]}
          >
            <Text style={styles.confirmButtonText}>Ready to Receive</Text>
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
              <Text style={styles.amountDisplay}>${amount}</Text>
              <Text style={styles.hint}>Hold sender's phone near your device...</Text>
            </View>
          </View>

          <Button onPress={onBack} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Button>
        </>
      )}

      {step === 'processing' && (
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.spinnerContainer,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <View style={styles.spinnerOuter} />
            <View style={styles.spinnerInner} />
          </Animated.View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Processing Payment</Text>
            <Text style={styles.subtitle}>Confirming transaction on blockchain...</Text>
          </View>
        </View>
      )}

      {step === 'success' && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.successTitle}>Payment Received!</Text>
              <Text style={styles.subtitle}>Transaction confirmed on blockchain</Text>

              <Card style={styles.infoCard}>
                <CardContent>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Amount</Text>
                      <Text style={styles.infoAmount}>${amount}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Type</Text>
                      <Text style={styles.infoValue}>{receiveType}</Text>
                    </View>
                  </View>

                  <View style={styles.hashContainer}>
                    <Text style={styles.hashLabel}>Transaction Hash</Text>
                    <Text style={styles.hashValue}>0x9d4c2e8...f1a3b5c7d9e1</Text>
                  </View>
                </CardContent>
              </Card>
            </View>
          </View>

          <Button onPress={onBack} style={styles.newTransactionButton}>
            <Text style={styles.newTransactionButtonText}>New Transaction</Text>
          </Button>
        </ScrollView>
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
    marginBottom: 24,
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
  infoAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22c55e',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  nfcIconContainer: {
    width: 128,
    height: 128,
    borderRadius: 24,
    overflow: 'hidden',
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
  amountDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f3f4f6',
  },
  subtitle: {
    fontSize: 18,
    color: '#d1d5db',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22c55e',
    textAlign: 'center',
  },
  spinnerContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerOuter: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#a855f7',
    borderRightColor: '#c084fc',
  },
  spinnerInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'transparent',
    borderBottomColor: '#a855f7',
    borderLeftColor: '#c084fc',
  },
  successIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  hashContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  hashLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  hashValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#9ca3af',
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
  cancelButton: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '600',
  },
  newTransactionButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#a855f7',
  },
  newTransactionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})

