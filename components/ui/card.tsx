import * as React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { cn } from '@/lib/utils'

interface CardProps {
  children?: React.ReactNode
  className?: string
  style?: ViewStyle
}

interface CardTextProps {
  children?: React.ReactNode
  className?: string
  style?: TextStyle
}

const Card: React.FC<CardProps> = ({ children, className, style }) => {
  return <View style={[styles.card, style]}>{children}</View>
}

const CardHeader: React.FC<CardProps> = ({ children, className, style }) => {
  return <View style={[styles.cardHeader, style]}>{children}</View>
}

const CardTitle: React.FC<CardTextProps> = ({ children, className, style }) => {
  return <Text style={[styles.cardTitle, style]}>{children}</Text>
}

const CardDescription: React.FC<CardTextProps> = ({ children, className, style }) => {
  return <Text style={[styles.cardDescription, style]}>{children}</Text>
}

const CardAction: React.FC<CardProps> = ({ children, className, style }) => {
  return <View style={[styles.cardAction, style]}>{children}</View>
}

const CardContent: React.FC<CardProps> = ({ children, className, style }) => {
  return <View style={[styles.cardContent, style]}>{children}</View>
}

const CardFooter: React.FC<CardProps> = ({ children, className, style }) => {
  return <View style={[styles.cardFooter, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: '#f3f4f6',
  },
  cardDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  cardAction: {
    alignSelf: 'flex-end',
  },
  cardContent: {
    paddingHorizontal: 0,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
  },
})

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

