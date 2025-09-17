import { useState } from 'react'
import { Package, Plus, Minus, Check, X, Camera, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MobileScanner } from './mobile-scanner'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { haptics } from '@/lib/haptics'

interface ReceivedItem {
  id: string
  sku: string
  name: string
  expectedQty: number
  receivedQty: number
  status: 'pending' | 'partial' | 'complete' | 'exception'
  notes?: string
}

export function MobileReceiving() {
  const [receivedItems, setReceivedItems] = useKV<ReceivedItem[]>('mobile-received-items', [])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  
  // Mock data for demo
  const [pendingItems] = useState<ReceivedItem[]>([
    {
      id: '1',
      sku: '012345678905',
      name: 'Copy Paper 8.5x11, Case',
      expectedQty: 5,
      receivedQty: 0,
      status: 'pending'
    },
    {
      id: '2', 
      sku: '123456789012',
      name: 'Glass Cleaner, 20oz Spray',
      expectedQty: 12,
      receivedQty: 8,
      status: 'partial'
    },
    {
      id: '3',
      sku: '987654321098', 
      name: 'Receipt Paper Rolls, Pack of 10',
      expectedQty: 3,
      receivedQty: 3,
      status: 'complete'
    }
  ])

  const handleScan = (barcode: string) => {
    const item = pendingItems.find(item => item.sku === barcode)
    if (item) {
      setSelectedItem(item.id)
      haptics.scanSuccess() // Success haptic for found item
      toast.success(`Found: ${item.name}`)
    } else {
      haptics.scanError() // Error haptic for unknown item
      toast.error(`Item not found: ${barcode}`)
    }
  }

  const updateQuantity = (itemId: string, change: number) => {
    const item = pendingItems.find(i => i.id === itemId)
    if (!item) return
    
    const newQty = Math.max(0, item.receivedQty + change)
    const newStatus = newQty === 0 ? 'pending' : 
                     newQty < item.expectedQty ? 'partial' : 'complete'
    
    // Update the item
    item.receivedQty = newQty
    item.status = newStatus
    
    // Haptic feedback based on action
    if (change > 0) {
      haptics.light() // Light haptic for increment
    } else if (change < 0) {
      haptics.medium() // Medium haptic for decrement
    }
    
    toast.success(`Updated ${item.name}: ${newQty} received`)
  }

  const receiveAll = (itemId: string) => {
    const item = pendingItems.find(i => i.id === itemId)
    if (!item) return
    
    item.receivedQty = item.expectedQty
    item.status = 'complete'
    
    haptics.success() // Success haptic for completing item
    toast.success(`Fully received: ${item.name}`)
  }

  const markException = (itemId: string) => {
    const item = pendingItems.find(i => i.id === itemId)
    if (!item) return
    
    item.status = 'exception'
    item.notes = 'Flagged for review'
    
    haptics.error() // Error haptic for exception
    toast.error(`Exception flagged: ${item.name}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Complete</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial</Badge>
      case 'exception':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Exception</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Scan Button */}
      <Card className="p-4">
        <Button
          onClick={() => {
            haptics.light() // Light haptic when opening scanner
            setScannerOpen(true)
          }}
          className="w-full h-16 text-lg font-semibold rounded-xl"
          size="lg"
        >
          <Camera size={24} className="mr-3" />
          Scan Item
        </Button>
      </Card>

      {/* Receiving Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Receiving Progress</h2>
          <Badge variant="outline">
            {pendingItems.filter(i => i.status === 'complete').length} / {pendingItems.length}
          </Badge>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-300"
            style={{ 
              width: `${(pendingItems.filter(i => i.status === 'complete').length / pendingItems.length) * 100}%` 
            }}
          />
        </div>
      </Card>

      {/* Items List */}
      <div className="space-y-3">
        {pendingItems.map((item) => (
          <Card 
            key={item.id}
            className={cn(
              "p-4 transition-all duration-200",
              selectedItem === item.id && "ring-2 ring-primary ring-offset-2"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight mb-1">{item.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">SKU: {item.sku}</p>
                {getStatusBadge(item.status)}
              </div>
              
              <div className="flex items-center gap-2 ml-3">
                <span className="text-2xl font-bold">
                  {item.receivedQty}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {item.expectedQty}
                </span>
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => updateQuantity(item.id, -1)}
                disabled={item.receivedQty === 0}
                className="h-10 w-10 rounded-full"
              >
                <Minus size={18} />
              </Button>
              
              <Input
                type="number"
                value={item.receivedQty}
                onChange={(e) => {
                  const newQty = parseInt(e.target.value) || 0
                  const change = newQty - item.receivedQty
                  updateQuantity(item.id, change)
                }}
                className="text-center text-lg font-semibold h-10 w-20"
              />
              
              <Button
                variant="outline" 
                size="icon"
                onClick={() => updateQuantity(item.id, 1)}
                className="h-10 w-10 rounded-full"
              >
                <Plus size={18} />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => receiveAll(item.id)}
                disabled={item.status === 'complete' || item.status === 'exception'}
                className="flex-1 h-10"
              >
                <Check size={16} className="mr-1" />
                Receive All
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => markException(item.id)}
                disabled={item.status === 'exception'}
                className="h-10 px-3"
              >
                <Warning size={16} />
              </Button>
            </div>
            
            {item.notes && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Note: {item.notes}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Complete Button */}
      <Card className="p-4">
        <Button
          className="w-full h-12 text-lg font-semibold"
          disabled={pendingItems.some(i => i.status === 'pending' || i.status === 'exception')}
          onClick={() => {
            const isComplete = !pendingItems.some(i => i.status === 'pending' || i.status === 'exception')
            if (isComplete) {
              haptics.success() // Success haptic for completing receiving
              toast.success('Receiving completed successfully!')
            }
          }}
        >
          <Package size={20} className="mr-2" />
          Complete Receiving
        </Button>
      </Card>

      {/* Scanner Modal */}
      <MobileScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </div>
  )
}