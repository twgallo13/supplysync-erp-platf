// Simple implementation of useKV hook for demo purposes


      const stored = localStorage.getItem(key)
    } catch {
    }
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
     
  })

    setValue(defaultValue)
      localStorage.rem
      console.error('Failed to remove from localStorage:', error)
  }
  return [value, setKVValue, deleteKVValue]








    setValue(defaultValue)
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  }

  return [value, setKVValue, deleteKVValue]
}