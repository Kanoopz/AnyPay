import ConfigurationScreen from '@/components/configuration-screen'
import HomeScreen from '@/components/home-screen'
import ReceiveDataScreen from '@/components/receive-data-screen'
import ReceivePaymentFlow from '@/components/receive-payment-flow'
import SendDataScreen from '@/components/send-data-screen'
import SendPaymentFlow from '@/components/send-payment-flow'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

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
          onSettingsClick={handleOpenConfig}
          onSendDataClick={handleSendData}
          onReceiveDataClick={handleReceiveData}
        />
      )}
      {currentScreen === 'send' && <SendPaymentFlow onBack={handleBack} />}
      {currentScreen === 'receive' && <ReceivePaymentFlow onBack={handleBack} />}
      {currentScreen === 'config' && <ConfigurationScreen onBack={handleBack} />}
      {currentScreen === 'sendData' && <SendDataScreen onBack={handleBack} />}
      {currentScreen === 'receiveData' && (
        <ReceiveDataScreen 
          onBack={handleBack} 
          onProceedToPayment={() => setCurrentScreen('send')}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0818',
  },
})
