import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import HomeScreen from '@/components/home-screen'
import SendPaymentFlow from '@/components/send-payment-flow'
import ReceivePaymentFlow from '@/components/receive-payment-flow'
import ConfigurationScreen from '@/components/configuration-screen'
import SendDataScreen from '@/components/send-data-screen'
import ReceiveDataScreen from '@/components/receive-data-screen'

type Screen = 'home' | 'send' | 'receive' | 'config' | 'sendData' | 'receiveData'

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')

  const handleSendPayment = () => setCurrentScreen('send')
  const handleReceivePayment = () => setCurrentScreen('receive')
  const handleOpenConfig = () => setCurrentScreen('config')
  const handleSendData = () => setCurrentScreen('sendData')
  const handleReceiveData = () => setCurrentScreen('receiveData')
  const handleBack = () => setCurrentScreen('home')

  return (
    <View style={styles.container}>
      {currentScreen === 'home' && (
        <HomeScreen
          onSendClick={handleSendPayment}
          onReceiveClick={handleReceivePayment}
          onSettingsClick={handleOpenConfig}
          onSendDataClick={handleSendData}
          onReceiveDataClick={handleReceiveData}
        />
      )}
      {currentScreen === 'send' && <SendPaymentFlow onBack={handleBack} />}
      {currentScreen === 'receive' && <ReceivePaymentFlow onBack={handleBack} />}
      {currentScreen === 'config' && <ConfigurationScreen onBack={handleBack} />}
      {currentScreen === 'sendData' && <SendDataScreen onBack={handleBack} />}
      {currentScreen === 'receiveData' && <ReceiveDataScreen onBack={handleBack} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0818',
  },
})
