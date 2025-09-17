import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/lib/types'
import { mockUsers } from '@/lib/mock-data'

interface AuthContextType {
  user: User | null
  login: (role: User['role']) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate checking for existing auth session
    const timer = setTimeout(() => {
      const savedRole = localStorage.getItem('demo-role')
      if (savedRole) {
        const mockUser = mockUsers.find(u => u.role === savedRole)
        if (mockUser) {
          setUser(mockUser)
        }
      }
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const login = (role: User['role']) => {
    const mockUser = mockUsers.find(u => u.role === role)
    if (mockUser) {
      setUser(mockUser)
      localStorage.setItem('demo-role', role)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('demo-role')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}