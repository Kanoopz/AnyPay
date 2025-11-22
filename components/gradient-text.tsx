import React from 'react'
import { Text, StyleSheet, TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'

interface GradientTextProps {
  children: React.ReactNode
  style?: TextStyle
  colors?: [string, string, ...string[]]
}

export default function GradientText({ children, style, colors = ['#a855f7', '#7f1d1d'] }: GradientTextProps) {
  const textStyle = [styles.text, style]
  
  return (
    <MaskedView
      style={styles.maskContainer}
      maskElement={
        <Text style={[textStyle, { color: 'black' }]}>{children}</Text>
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={[textStyle, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  )
}

const styles = StyleSheet.create({
  maskContainer: {
    flexDirection: 'row',
  },
  gradient: {
    flex: 1,
  },
  text: {
    backgroundColor: 'transparent',
  },
})

