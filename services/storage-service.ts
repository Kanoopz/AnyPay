import AsyncStorage from '@react-native-async-storage/async-storage'

export interface AppConfiguration {
  // Sending preferences
  sendChain: string
  sendChainId: string
  sendToken: string
  sendTokenAddress: string

  // Receiving preferences
  receiveType: 'crypto' | 'fiat'
  receiveChain: string
  receiveChainId: string
  receiveToken: string
  receiveTokenAddress: string
  receiveFiat: string
}

const CONFIG_STORAGE_KEY = '@anypay:configuration'

const DEFAULT_CONFIG: AppConfiguration = {
  sendChain: 'Polygon',
  sendChainId: '80001', // Mumbai testnet
  sendToken: 'USDC',
  sendTokenAddress: '',
  receiveType: 'crypto',
  receiveChain: 'Polygon',
  receiveChainId: '80001', // Mumbai testnet
  receiveToken: 'USDC',
  receiveTokenAddress: '',
  receiveFiat: 'USD',
}

export const saveConfiguration = async (config: Partial<AppConfiguration>): Promise<void> => {
  try {
    const currentConfig = await loadConfiguration()
    const updatedConfig = { ...currentConfig, ...config }
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig))
    console.log('✅ Configuration saved:', updatedConfig)
  } catch (error) {
    console.error('❌ Error saving configuration:', error)
    throw error
  }
}

export const loadConfiguration = async (): Promise<AppConfiguration> => {
  try {
    const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY)
    if (stored) {
      const config = JSON.parse(stored) as AppConfiguration
      console.log('✅ Configuration loaded:', config)
      return { ...DEFAULT_CONFIG, ...config }
    }
    console.log('📝 No saved configuration, using defaults')
    return DEFAULT_CONFIG
  } catch (error) {
    console.error('❌ Error loading configuration:', error)
    return DEFAULT_CONFIG
  }
}

export const clearConfiguration = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CONFIG_STORAGE_KEY)
    console.log('✅ Configuration cleared')
  } catch (error) {
    console.error('❌ Error clearing configuration:', error)
    throw error
  }
}

