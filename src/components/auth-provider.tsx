import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'
import { apiService } from '@/services/api'

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
    // Check for existing session
    const checkAuth = async () => {
      try {
        const savedRole = localStorage.getItem('demo-role')
        if (savedRole) {
          // For demo purposes, set user based on saved role
          const currentUser = await apiService.getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (role: User['role']) => {
    try {
      // For demo purposes, we'll simulate login based on role
      const currentUser = await apiService.getCurrentUser()
      if (currentUser) {
        setUser({ ...currentUser, role })
        localStorage.setItem('demo-role', role)
      }
    } catch (error) {
      console.error('Login failed:', error)
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