import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from './components/auth-provider'
import { LoginScreen } from './components/login-screen'
import { Header } from './components/layout/header'
import { Sidebar } from './components/layout/sidebar'
import { Dashboard } from './components/views/dashboard'
import { Catalog } from './components/views/catalog'
import { Orders } from './components/views/orders'
import { Approvals } from './components/views/approvals'
import { Fulfillment } from './components/views/fulfillment'
import { Receiving } from './components/views/receiving'
import { Analytics } from './components/views/analytics'
import { Replenishment } from './components/views/replenishment'
import { Settings } from './components/views/settings'

function AppContent() {
  const { user, isLoading } = useAuth()
  const [activeView, setActiveView] = useState('dashboard')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading SupplySync ERP...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onViewChange={setActiveView} />
      case 'catalog':
        return <Catalog onViewChange={setActiveView} />
      case 'orders':
        return <Orders onViewChange={setActiveView} />
      case 'approvals':
        return <Approvals onViewChange={setActiveView} />
      case 'fulfillment':
        return <Fulfillment onViewChange={setActiveView} />
      case 'receiving':
        return <Receiving onViewChange={setActiveView} />
      case 'analytics':
        return <Analytics onViewChange={setActiveView} />
      case 'replenishment':
        return <Replenishment onViewChange={setActiveView} />
      case 'settings':
        return <Settings onViewChange={setActiveView} />
      default:
        return <Dashboard onViewChange={setActiveView} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1">
          {renderView()}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        richColors 
        position="top-right"
        closeButton
      />
    </AuthProvider>
  )
}

export default App