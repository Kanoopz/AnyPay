import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { loadConfiguration, saveConfiguration } from '@/services/storage-service'
import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ConfigurationScreenProps {
  onBack: () => void
}

// Chain name to ID mapping (Testnets)
const CHAIN_IDS: Record<string, string> = {
  Ethereum: '11155111', // Sepolia testnet
  Polygon: '80001', // Mumbai testnet
  Arbitrum: '421614', // Arbitrum Sepolia testnet
  Optimism: '11155420', // Optimism Sepolia testnet
}

type ConfigMode = 'view' | 'edit'

export default function ConfigurationScreen({ onBack }: ConfigurationScreenProps) {
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<ConfigMode>('view')
  const [showSaved, setShowSaved] = useState(false)
  const [sendChain, setSendChain] = useState('Arbitrum')
  const [sendChainId, setSendChainId] = useState('421614')
  const [sendAsset, setSendAsset] = useState('ETH')
  const [receiveType, setReceiveType] = useState<'crypto' | 'fiat'>('crypto')
  const [receiveChain, setReceiveChain] = useState('Optimism')
  const [receiveChainId, setReceiveChainId] = useState('11155420')
  const [receiveAsset, setReceiveAsset] = useState('USDC')
  const [receiveFiat, setReceiveFiat] = useState('USD')

  const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism']
  const assets = ['USDC', 'USDT', 'ETH', 'wBTC']
  const fiats = ['USD', 'EUR', 'GBP']

  // Load saved configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await loadConfiguration()
        setSendChain(config.sendChain)
        setSendChainId(config.sendChainId)
        setSendAsset(config.sendToken)
        setReceiveType(config.receiveType)
        setReceiveChain(config.receiveChain)
        setReceiveChainId(config.receiveChainId)
        setReceiveAsset(config.receiveToken)
        setReceiveFiat(config.receiveFiat)
      } catch (error) {
        console.error('Error loading configuration:', error)
      }
    }
    loadConfig()
  }, [])

  // Update chain ID when chain name changes
  const handleSendChainChange = (chain: string) => {
    setSendChain(chain)
    setSendChainId(CHAIN_IDS[chain] || '')
  }

  const handleReceiveChainChange = (chain: string) => {
    setReceiveChain(chain)
    setReceiveChainId(CHAIN_IDS[chain] || '')
  }

  const handleSave = async () => {
    try {
      await saveConfiguration({
        sendChain,
        sendChainId,
        sendToken: sendAsset,
        sendTokenAddress: '',
        receiveType,
        receiveChain,
        receiveChainId,
        receiveToken: receiveAsset,
        receiveTokenAddress: '',
        receiveFiat,
      })
      setShowSaved(true)
      setTimeout(() => {
        setShowSaved(false)
        setMode('view') // Switch back to view mode after saving
      }, 2000)
    } catch (error) {
      console.error('Error saving configuration:', error)
      // Could show error alert here
    }
  }

  const handleEdit = () => {
    setMode('edit')
  }

  const handleCancel = () => {
    // Reload saved config to discard changes
    const reloadConfig = async () => {
      try {
        const config = await loadConfiguration()
        setSendChain(config.sendChain)
        setSendChainId(config.sendChainId)
        setSendAsset(config.sendToken)
        setReceiveType(config.receiveType)
        setReceiveChain(config.receiveChain)
        setReceiveChainId(config.receiveChainId)
        setReceiveAsset(config.receiveToken)
        setReceiveFiat(config.receiveFiat)
      } catch (error) {
        console.error('Error loading configuration:', error)
      }
    }
    reloadConfig()
    setMode('view')
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
        {mode === 'view' ? (
          <TouchableOpacity onPress={handleEdit} style={styles.editButton} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color="#a855f7" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton} activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {mode === 'view' ? (
          // VIEW MODE - Display only
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sending Preferences</Text>
              <Card style={styles.infoCard}>
                <CardContent>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Blockchain</Text>
                    <Text style={styles.infoValue}>{sendChain}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chain ID</Text>
                    <Text style={styles.infoValue}>{sendChainId || 'Not set'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Token</Text>
                    <Text style={styles.infoValue}>{sendAsset}</Text>
                  </View>
                </CardContent>
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receiving Preferences</Text>
              <Card style={styles.infoCard}>
                <CardContent>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Receive As</Text>
                    <Text style={styles.infoValue}>{receiveType === 'crypto' ? 'Crypto' : 'Fiat'}</Text>
                  </View>
                  {receiveType === 'crypto' ? (
                    <>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Blockchain</Text>
                        <Text style={styles.infoValue}>{receiveChain}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Chain ID</Text>
                        <Text style={styles.infoValue}>{receiveChainId || 'Not set'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Token</Text>
                        <Text style={styles.infoValue}>{receiveAsset}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Fiat Currency</Text>
                      <Text style={styles.infoValue}>{receiveFiat}</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </View>
          </>
        ) : (
          // EDIT MODE - Interactive
          <>
            <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sending Preferences</Text>
          <View style={styles.optionsContainer}>
            <Text style={styles.optionLabel}>Default Blockchain</Text>
            <View style={styles.grid}>
              {chains.map((chain) => (
                <TouchableOpacity
                  key={chain}
                  onPress={() => handleSendChainChange(chain)}
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

            <Text style={styles.optionLabel}>Blockchain ID</Text>
            <TextInput
              style={styles.textInput}
              value={sendChainId}
              onChangeText={setSendChainId}
              placeholder="Enter chain ID (e.g., 80001)"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              editable={true}
            />

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
                      onPress={() => handleReceiveChainChange(chain)}
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

                <Text style={styles.optionLabel}>Blockchain ID</Text>
                <TextInput
                  style={styles.textInput}
                  value={receiveChainId}
                  onChangeText={setReceiveChainId}
                  placeholder="Enter chain ID (e.g., 80001)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  editable={true}
                />

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
          </>
        )}
      </ScrollView>

      {mode === 'edit' && (
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
    marginTop: 16,
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
  textInput: {
    width: '100%',
    minHeight: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f3f4f6',
    fontFamily: 'monospace',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f3f4f6',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  addressValue: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
})

