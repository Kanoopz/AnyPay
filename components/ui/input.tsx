import * as React from 'react'
import { TextInput, StyleSheet, ViewStyle, TextInputProps } from 'react-native'
import { cn } from '@/lib/utils'

interface InputProps extends TextInputProps {
  className?: string
  style?: ViewStyle
}

const Input: React.FC<InputProps> = ({ className, style, ...props }) => {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    height: 36,
    width: '100%',
    minWidth: 0,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#f3f4f6',
  },
})

export { Input }

