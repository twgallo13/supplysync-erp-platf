import { useState } from 'react'
import { Camera, Package, ClockCounterClockwise, Barcode } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MobileScanner } from '../mobile/mobile-scanner'
import { MobileLayout } from '../layout/mobile-layout'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { haptics } from '@/lib/haptics'

interface ScanHistoryItem {
  id: string
  barcode: string
  productName: string
  timestamp: string
  action: 'received' | 'located' | 'counted'
}

interface MobileScanProps {
  onViewChange?: (view: string) => void
}

export function MobileScan({ onViewChange }: MobileScanProps) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanHistory, setScanHistory] = useKV<ScanHistoryItem[]>('scan-history', [])

  // Mock product database for demo
  const productDatabase: Record<string, string> = {
    '012345678905': 'Copy Paper 8.5x11, Case',
    '123456789012': 'Glass Cleaner, 20oz Spray', 
    '987654321098': 'Receipt Paper Rolls, Pack of 10',
    'SKU-GL-085-001': 'Multi-Surface Cleaner, 32oz'
  }

  const handleScan = (barcode: string) => {
    const productName = productDatabase[barcode] || 'Unknown Product'
    
    // Determine if this is a known or unknown product
    const isKnownProduct = productDatabase[barcode] !== undefined
    
    const newScanItem: ScanHistoryItem = {
      id: Date.now().toString(),
      barcode,
      productName,
      timestamp: new Date().toLocaleTimeString(),
      action: 'located'
    }

    setScanHistory(currentHistory => [newScanItem, ...(currentHistory || []).slice(0, 9)])
    
    if (isKnownProduct) {
      haptics.scanSuccess() // Success haptic for known product
      toast.success(`Scanned: ${productName}`)
    } else {
      haptics.warning() // Warning haptic for unknown product
      toast.warning(`Unknown product scanned: ${barcode}`, {
        description: 'Product not found in catalog'
      })
    }
  }

  const clearHistory = () => {
    setScanHistory([])
    haptics.medium() // Medium haptic for clearing action
    toast.success('Scan history cleared')
  }

  const quickActions = [
    {
      id: 'receive',
      label: 'Go to Receiving',
      icon: Package,
      onClick: () => {
        haptics.select() // Light haptic for navigation
        onViewChange?.('receiving')
      }
    },
    {
      id: 'manual',
      label: 'Manual Entry',
      icon: Barcode,
      onClick: () => {
        // Manual barcode entry
        const barcode = prompt('Enter barcode:')
        if (barcode?.trim()) {
          handleScan(barcode.trim())
        } else if (barcode === '') {
          haptics.warning() // Warning haptic for empty input
        }
      }
    }
  ]

  return (
    <MobileLayout title="Scanner" showNavigation={false}>
      <div className="p-4 space-y-6">
        {/* Main Scan Button */}
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Camera size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Ready to Scan</h1>
              <p className="text-muted-foreground">
                Tap the button below to start scanning barcodes
              </p>
            </div>
            <Button
              onClick={() => {
                haptics.light() // Light haptic when opening scanner
                setScannerOpen(true)
              }}
              className="w-full h-16 text-xl font-semibold rounded-xl"
              size="lg"
            >
              <Camera size={28} className="mr-3" />
              Start Scanning
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  onClick={action.onClick}
                  className="h-20 flex-col gap-2 text-sm"
                >
                  <Icon size={24} />
                  {action.label}
                </Button>
              )
            })}
          </div>
        </Card>

        {/* Recent Scans */}
        {scanHistory && scanHistory.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClockCounterClockwise size={20} className="text-muted-foreground" />
                <h2 className="font-semibold">Recent Scans</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
            
            <div className="space-y-3">
              {(scanHistory || []).slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.barcode} • {item.timestamp}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {item.action}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tips */}
        <Card className="p-4 bg-accent/5 border-accent/20">
          <h3 className="font-semibold text-accent-foreground mb-2">
            Scanning Tips
          </h3>
          <ul className="text-sm text-accent-foreground/80 space-y-1">
            <li>• Hold device steady and ensure good lighting</li>
            <li>• Position barcode within the frame</li>
            <li>• Use manual entry for damaged codes</li>
            <li>• Keep lens clean for best results</li>
          </ul>
        </Card>
      </div>

      {/* Scanner Modal */}
      <MobileScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </MobileLayout>
  )
}