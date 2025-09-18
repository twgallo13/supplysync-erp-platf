import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from './components/auth-provider'
import { LoginScreen } from './components/login-screen'
import { Header } from './components/layout/header'
import { Sidebar } from './components/layout/sidebar'
import { MobileNavigation } from './components/layout/mobile-navigation'
import { Dashboard } from './components/views/dashboard'
import { Catalog } from './components/views/catalog'
import { Orders } from './components/views/orders'
import { Approvals } from './components/views/approvals'
import { Fulfillment } from './components/views/fulfillment'
import { Receiving } from './components/views/receiving'
import { Analytics } from './components/views/analytics'
import { Replenishment } from './components/views/replenishment'
import { Settings } from './components/views/settings'
import { MobileScan } from './components/views/mobile-scan'
import { MobileReceiving } from './components/mobile/mobile-receiving'
import { MobileDashboard } from './components/views/mobile-dashboard'
import { MobileLayout } from './components/layout/mobile-layout'

function AppContent() {
  const { user, isLoading } = useAuth()
  const [activeView, setActiveView] = useState('dashboard')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  const renderMobileView = () => {
    switch (activeView) {
      case 'scan':
        return <MobileScan onViewChange={setActiveView} />
      case 'receiving':
        return (
          <MobileLayout 
            title="Receiving" 
            activeView={activeView} 
            onViewChange={setActiveView}
          >
            <MobileReceiving />
          </MobileLayout>
        )
      case 'orders':
        return (
          <MobileLayout 
            title="Orders" 
            activeView={activeView} 
            onViewChange={setActiveView}
          >
            <Orders onViewChange={setActiveView} />
          </MobileLayout>
        )
      case 'analytics':
        return (
          <MobileLayout 
            title="Analytics" 
            activeView={activeView} 
            onViewChange={setActiveView}
          >
            <Analytics onViewChange={setActiveView} />
          </MobileLayout>
        )
      case 'settings':
        return (
          <MobileLayout 
            title="Settings" 
            activeView={activeView} 
            onViewChange={setActiveView}
          >
            <Settings onViewChange={setActiveView} />
          </MobileLayout>
        )
      default:
        return (
          <MobileLayout 
            showNavigation={true}
            activeView={activeView} 
            onViewChange={setActiveView}
          >
            <MobileDashboard onViewChange={setActiveView} />
          </MobileLayout>
        )
    }
  }

  const renderDesktopView = () => {
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

  // Mobile-first responsive design
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {renderMobileView()}
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1">
          {renderDesktopView()}
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