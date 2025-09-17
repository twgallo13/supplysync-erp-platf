import { useState, useEffect } from 'react'

// Simple implementation of useKV hook for demo purposes
// In production, this would use the actual @github/spark/hooks
export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setKVValue = (newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const finalValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue
      try {
        localStorage.setItem(key, JSON.stringify(finalValue))
      } catch (error) {
        console.error('Failed to save to localStorage:', error)
      }
      return finalValue
    })
  }

  const deleteKVValue = () => {
    setValue(defaultValue)
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  }

  return [value, setKVValue, deleteKVValue]
}