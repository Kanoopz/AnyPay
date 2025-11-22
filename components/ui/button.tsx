import * as React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, StyleProp } from 'react-native'
import { cn } from '@/lib/utils'

interface ButtonProps {
  children?: React.ReactNode
  onPress?: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
  className?: string
  style?: StyleProp<ViewStyle>
  textStyle?: TextStyle
}

const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  disabled = false,
  variant = 'default',
  size = 'default',
  className,
  style,
  textStyle,
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ]

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    textStyle,
  ]

  return (
    <TouchableOpacity
      style={[...buttonStyles, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {typeof children === 'string' ? (
        <Text style={textStyles}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    flexDirection: 'row',
  },
  default: {
    backgroundColor: '#9333ea',
  },
  destructive: {
    backgroundColor: '#ef4444',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondary: {
    backgroundColor: '#6b7280',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
  },
  size_default: {
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  size_sm: {
    height: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  size_lg: {
    height: 40,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  size_icon: {
    width: 36,
    height: 36,
    padding: 0,
  },
  'size_icon-sm': {
    width: 32,
    height: 32,
    padding: 0,
  },
  'size_icon-lg': {
    width: 40,
    height: 40,
    padding: 0,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  text_default: {
    color: '#ffffff',
  },
  text_destructive: {
    color: '#ffffff',
  },
  text_outline: {
    color: '#111827',
  },
  text_secondary: {
    color: '#ffffff',
  },
  text_ghost: {
    color: '#111827',
  },
  text_link: {
    color: '#9333ea',
    textDecorationLine: 'underline',
  },
  textSize_default: {
    fontSize: 14,
  },
  textSize_sm: {
    fontSize: 12,
  },
  textSize_lg: {
    fontSize: 16,
  },
  textSize_icon: {
    fontSize: 16,
  },
  'textSize_icon-sm': {
    fontSize: 14,
  },
  'textSize_icon-lg': {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.5,
  },
})

export { Button }

