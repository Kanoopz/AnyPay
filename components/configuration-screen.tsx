import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ConfigurationScreenProps {
  onBack: () => void
}

export default function ConfigurationScreen({ onBack }: ConfigurationScreenProps) {
  const insets = useSafeAreaInsets()
  const [showSaved, setShowSaved] = useState(false)
  const [sendChain, setSendChain] = useState('Polygon')
  const [sendAsset, setSendAsset] = useState('USDC')
  const [receiveType, setReceiveType] = useState<'crypto' | 'fiat'>('crypto')
  const [receiveChain, setReceiveChain] = useState('Polygon')
  const [receiveAsset, setReceiveAsset] = useState('USDC')
  const [receiveFiat, setReceiveFiat] = useState('USD')

  const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism']
  const assets = ['USDC', 'USDT', 'ETH', 'wBTC']
  const fiats = ['USD', 'EUR', 'GBP']

  const handleSave = () => {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.backgroundBlur1} />
      <View style={styles.backgroundBlur2} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#f3f4f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sending Preferences</Text>
          <View style={styles.optionsContainer}>
            <Text style={styles.optionLabel}>Default Blockchain</Text>
            <View style={styles.grid}>
              {chains.map((chain) => (
                <TouchableOpacity
                  key={chain}
                  onPress={() => setSendChain(chain)}
                  style={[
                    styles.optionButton,
                    sendChain === chain && styles.optionButtonActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      sendChain === chain && styles.optionButtonTextActive,
                    ]}
                  >
                    {chain}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.optionLabel}>Default Payment Asset</Text>
            <View style={styles.grid}>
              {assets.map((asset) => (
                <TouchableOpacity
                  key={asset}
                  onPress={() => setSendAsset(asset)}
                  style={[
                    styles.optionButton,
                    sendAsset === asset && styles.optionButtonActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      sendAsset === asset && styles.optionButtonTextActive,
                    ]}
                  >
                    {asset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receiving Preferences</Text>
          <View style={styles.optionsContainer}>
            <Text style={styles.optionLabel}>Receive As</Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => setReceiveType('crypto')}
                style={[
                  styles.toggleButton,
                  receiveType === 'crypto' && styles.toggleButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    receiveType === 'crypto' && styles.toggleButtonTextActive,
                  ]}
                >
                  Crypto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setReceiveType('fiat')}
                style={[
                  styles.toggleButton,
                  receiveType === 'fiat' && styles.toggleButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    receiveType === 'fiat' && styles.toggleButtonTextActive,
                  ]}
                >
                  Fiat
                </Text>
              </TouchableOpacity>
            </View>

            {receiveType === 'crypto' ? (
              <>
                <Text style={styles.optionLabel}>Default Blockchain</Text>
                <View style={styles.grid}>
                  {chains.map((chain) => (
                    <TouchableOpacity
                      key={chain}
                      onPress={() => setReceiveChain(chain)}
                      style={[
                        styles.optionButton,
                        receiveChain === chain && styles.optionButtonActiveRed,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          receiveChain === chain && styles.optionButtonTextActive,
                        ]}
                      >
                        {chain}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.optionLabel}>Default Receive Asset</Text>
                <View style={styles.grid}>
                  {assets.map((asset) => (
                    <TouchableOpacity
                      key={asset}
                      onPress={() => setReceiveAsset(asset)}
                      style={[
                        styles.optionButton,
                        receiveAsset === asset && styles.optionButtonActiveRed,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          receiveAsset === asset && styles.optionButtonTextActive,
                        ]}
                      >
                        {asset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.optionLabel}>Fiat Currency</Text>
                <View style={styles.grid}>
                  {fiats.map((fiat) => (
                    <TouchableOpacity
                      key={fiat}
                      onPress={() => setReceiveFiat(fiat)}
                      style={[
                        styles.optionButton,
                        receiveFiat === fiat && styles.optionButtonActiveRed,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          receiveFiat === fiat && styles.optionButtonTextActive,
                        ]}
                      >
                        {fiat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Card style={styles.bankCard}>
                  <CardContent>
                    <Text style={styles.bankLabel}>Connected Bank Account</Text>
                    <Text style={styles.bankValue}>•••• 4242</Text>
                    <TouchableOpacity style={styles.changeAccountButton}>
                      <Text style={styles.changeAccountText}>Change Account</Text>
                    </TouchableOpacity>
                  </CardContent>
                </Card>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {showSaved && (
          <Card style={styles.savedCard}>
            <CardContent>
              <View style={styles.savedContent}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.savedText}>Settings saved successfully!</Text>
              </View>
            </CardContent>
          </Card>
        )}
        <Button onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Configuration</Text>
        </Button>
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
  backgroundBlur1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 384,
    height: 384,
    backgroundColor: '#a855f7',
    borderRadius: 192,
    opacity: 0.1,
  },
  backgroundBlur2: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 384,
    height: 384,
    backgroundColor: '#7f1d1d',
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
    paddingBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f3f4f6',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  optionButtonActiveRed: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  optionButtonTextActive: {
    color: '#f3f4f6',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  toggleButtonTextActive: {
    color: '#f3f4f6',
  },
  bankCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    marginTop: 16,
  },
  bankLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  bankValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 12,
  },
  changeAccountButton: {
    alignSelf: 'flex-start',
  },
  changeAccountText: {
    fontSize: 12,
    color: '#a855f7',
  },
  footer: {
    gap: 12,
    zIndex: 10,
  },
  savedCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  savedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#86efac',
  },
  saveButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#a855f7',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})

