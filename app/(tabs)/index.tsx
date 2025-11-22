import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import HomeScreen from '@/components/home-screen'
import SendPaymentFlow from '@/components/send-payment-flow'
import ReceivePaymentFlow from '@/components/receive-payment-flow'
import ConfigurationScreen from '@/components/configuration-screen'

type Screen = 'home' | 'send' | 'receive' | 'config'

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')

  const handleSendPayment = () => setCurrentScreen('send')
  const handleReceivePayment = () => setCurrentScreen('receive')
  const handleOpenConfig = () => setCurrentScreen('config')
  const handleBack = () => setCurrentScreen('home')

  return (
    <View style={styles.container}>
      {currentScreen === 'home' && (
        <HomeScreen
          onSendClick={handleSendPayment}
          onReceiveClick={handleReceivePayment}
          onSettingsClick={handleOpenConfig}
        />
      )}
      {currentScreen === 'send' && <SendPaymentFlow onBack={handleBack} />}
      {currentScreen === 'receive' && <ReceivePaymentFlow onBack={handleBack} />}
      {currentScreen === 'config' && <ConfigurationScreen onBack={handleBack} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0818',
  },
})
