import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  Scan, 
  CheckCircle, 
  Warning, 
  Plus,
  Minus,
  Eye
} from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { mockOrders, mockProducts } from '@/lib/mock-data'
import { Order } from '@/lib/types'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface ReceivingProps {
  onViewChange: (view: string) => void
}

interface ReceivingEntry {
  order_id: string
  product_id: string
  expected_quantity: number
  received_quantity: number
  receiving_mode: 'mass' | 'case' | 'piece' | 'manual'
  barcode_scanned?: string
  discrepancy_reason?: string
  received_at: string
  received_by: string
}

const receivingModes = [
  { value: 'mass', label: 'Mass Receive All', description: 'Receive entire shipment with one click' },
  { value: 'case', label: 'Case Scan', description: 'Scan cases and apply case pack quantity' },
  { value: 'piece', label: 'Piece Scan', description: 'Scan individual items' },
  { value: 'manual', label: 'Manual Entry', description: 'Enter quantities manually' }
]

const discrepancyReasons = [
  'Damaged items',
  'Short shipment',
  'Wrong product received',
  'Expired items',
  'Quality issues',
  'Other'
]

export function Receiving({ onViewChange }: ReceivingProps) {
  const { user } = useAuth()
  const [receivingEntries, setReceivingEntries] = useKV<ReceivingEntry[]>('receiving-entries', [])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [receivingMode, setReceivingMode] = useState('mass')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityInput, setQuantityInput] = useState('')
  const [discrepancyReason, setDiscrepancyReason] = useState('')
  const [notes, setNotes] = useState('')
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus barcode input when dialog opens and mode changes
  useEffect(() => {
    if (selectedOrder && ['case', 'piece'].includes(receivingMode)) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100)
    }
  }, [selectedOrder, receivingMode])

  if (!user || !['SM', 'FM'].includes(user.role)) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Only Store Managers and Facility Managers can access receiving.</p>
      </div>
    )
  }

  // Get orders that are in transit or partially delivered
  const inboundOrders = mockOrders.filter(order => 
    ['IN_TRANSIT', 'PARTIALLY_DELIVERED'].includes(order.status) &&
    (user.role === 'FM' || order.store_id === user.assignment.id)
  )

  const getProductName = (productId: string) => {
    const product = mockProducts.find(p => p.product_id === productId)
    return product?.display_name || 'Unknown Product'
  }

  const getProductByBarcode = (barcode: string) => {
    // Check exact SKU match first
    let product = mockProducts.find(p => p.sku === barcode)
    if (product) return product

    // Check vendor SKU mapping
    product = mockProducts.find(p => 
      p.vendors.some(v => v.vendor_sku === barcode)
    )
    if (product) return product

    // Check barcode aliases if they exist
    product = mockProducts.find(p => 
      p.vendors.some(v => 
        v.vendorSkuMap?.barcodeAliases?.includes(barcode)
      )
    )
    if (product) return product

    // Partial match for demo purposes
    return mockProducts.find(p => 
      p.sku.toLowerCase().includes(barcode.toLowerCase()) ||
      p.display_name.toLowerCase().includes(barcode.toLowerCase())
    )
  }

  const handleMassReceive = (order: Order) => {
    const entries: ReceivingEntry[] = order.line_items.map(item => ({
      order_id: order.order_id,
      product_id: item.product_id,
      expected_quantity: item.quantity,
      received_quantity: item.quantity,
      receiving_mode: 'mass',
      received_at: new Date().toISOString(),
      received_by: user.user_id
    }))

    setReceivingEntries(current => [...(current || []), ...entries])
    toast.success(`All items from Order #${order.order_id.slice(-6)} received successfully`)
    setSelectedOrder(null)
  }

  const handleBarcodeReceive = (order: Order) => {
    if (!barcodeInput.trim()) {
      toast.error('Please scan or enter a barcode')
      return
    }

    const product = getProductByBarcode(barcodeInput.trim())
    if (!product) {
      toast.error('Unknown barcode. Create alias or scan different item.', {
        action: {
          label: 'Create Alias',
          onClick: () => {
            toast.success('Barcode alias creation would be handled here')
            setBarcodeInput('')
          }
        }
      })
      return
    }

    const lineItem = order.line_items.find(item => item.product_id === product.product_id)
    if (!lineItem) {
      toast.error('This product is not expected in this shipment')
      return
    }

    // Calculate quantity based on receiving mode
    let quantity = 1
    if (receivingMode === 'case') {
      quantity = product.pack_quantity || 1
    } else if (receivingMode === 'piece' && quantityInput) {
      quantity = parseInt(quantityInput) || 1
    }

    // Check if we're not over-receiving
    const alreadyReceived = getReceivedQuantity(order.order_id, product.product_id)
    if (alreadyReceived + quantity > lineItem.quantity) {
      toast.error(`Cannot receive ${quantity} items. Only ${lineItem.quantity - alreadyReceived} remaining.`)
      return
    }

    const entry: ReceivingEntry = {
      order_id: order.order_id,
      product_id: product.product_id,
      expected_quantity: lineItem.quantity,
      received_quantity: quantity,
      receiving_mode: receivingMode as 'case' | 'piece',
      barcode_scanned: barcodeInput.trim(),
      received_at: new Date().toISOString(),
      received_by: user.user_id
    }

    setReceivingEntries(current => [...(current || []), entry])
    toast.success(`Received ${quantity}x ${product.display_name}`)
    setBarcodeInput('')
    setQuantityInput('')
  }

  const handleManualReceive = (order: Order, productId: string, quantity: number) => {
    const entry: ReceivingEntry = {
      order_id: order.order_id,
      product_id: productId,
      expected_quantity: order.line_items.find(item => item.product_id === productId)?.quantity || 0,
      received_quantity: quantity,
      receiving_mode: 'manual',
      discrepancy_reason: discrepancyReason || undefined,
      received_at: new Date().toISOString(),
      received_by: user.user_id
    }

    setReceivingEntries(current => [...(current || []), entry])
    toast.success(`Manually received ${quantity} items`)
  }

  const getReceivedQuantity = (orderId: string, productId: string) => {
    const entries = (receivingEntries || []).filter(entry => 
      entry.order_id === orderId && entry.product_id === productId
    )
    return entries.reduce((sum, entry) => sum + entry.received_quantity, 0)
  }

  const ReceivingDialog = ({ order }: { order: Order }) => (
    <Dialog open={!!selectedOrder && selectedOrder.order_id === order.order_id} onOpenChange={(open) => {
      if (!open) {
        setSelectedOrder(null)
        setBarcodeInput('')
        setQuantityInput('')
        setDiscrepancyReason('')
        setNotes('')
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2" 
          onClick={() => setSelectedOrder(order)}
        >
          <Package size={16} />
          Receive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Shipment - Order #{order.order_id.slice(-6)}</DialogTitle>
          <DialogDescription>
            Select receiving mode and process inbound items
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={receivingMode} onValueChange={setReceivingMode} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            {receivingModes.map(mode => (
              <TabsTrigger key={mode.value} value={mode.value} className="text-xs">
                {mode.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="mass" className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Mass Receive All Items</h4>
              <p className="text-sm text-green-700 mb-4">
                This will mark all expected items as received with full quantities.
              </p>
              <Button onClick={() => handleMassReceive(order)} className="gap-2">
                <CheckCircle size={16} />
                Receive All Items
              </Button>
            </div>
          </TabsContent>

          {(receivingMode === 'case' || receivingMode === 'piece') && (
            <TabsContent value={receivingMode} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode-input">Barcode / UPC</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={barcodeInputRef}
                      id="barcode-input"
                      placeholder="Scan or type barcode..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && selectedOrder) {
                          e.preventDefault()
                          handleBarcodeReceive(selectedOrder)
                        }
                      }}
                      className="flex-1"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Button variant="outline" size="sm" title="Focus barcode input">
                      <Scan size={16} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Try scanning: 012345678901, ST-CP8511, or SKU-PP-8511
                  </p>
                </div>
                
                {receivingMode === 'piece' && (
                  <div className="space-y-2">
                    <Label htmlFor="quantity-input">Quantity</Label>
                    <Input
                      id="quantity-input"
                      type="number"
                      placeholder="Enter quantity..."
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button 
                onClick={() => handleBarcodeReceive(order)} 
                className="gap-2"
                disabled={!barcodeInput}
              >
                <Package size={16} />
                Receive Item
              </Button>
            </TabsContent>
          )}

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Expected Items</h4>
              {order.line_items.map((item, index) => {
                const receivedQty = getReceivedQuantity(order.order_id, item.product_id)
                const remainingQty = item.quantity - receivedQty
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{getProductName(item.product_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        Expected: {item.quantity} • Received: {receivedQty} • Remaining: {remainingQty}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        className="w-20"
                        max={remainingQty}
                        onChange={(e) => setQuantityInput(e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleManualReceive(order, item.product_id, parseInt(quantityInput) || 0)}
                        disabled={!quantityInput || remainingQty <= 0}
                      >
                        Receive
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Discrepancy Handling */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="discrepancy-reason">Discrepancy Reason (if applicable)</Label>
            <Select value={discrepancyReason} onValueChange={setDiscrepancyReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {discrepancyReasons.map(reason => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiving-notes">Notes</Label>
            <Textarea
              id="receiving-notes"
              placeholder="Add any notes about this receiving..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receiving</h1>
        <p className="text-muted-foreground">
          Process inbound shipments and verify deliveries
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Receipts</CardTitle>
            <Package size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboundOrders.length}</div>
            <p className="text-xs text-muted-foreground">Orders awaiting receipt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Received Today</CardTitle>
            <CheckCircle size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(receivingEntries || []).filter(entry => {
                const today = new Date().toDateString()
                return new Date(entry.received_at).toDateString() === today
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Items processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
            <Warning size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(receivingEntries || []).filter(entry => entry.discrepancy_reason).length}
            </div>
            <p className="text-xs text-muted-foreground">Items with issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Inbound Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Inbound Shipments</CardTitle>
          <CardDescription>Orders ready for receiving</CardDescription>
        </CardHeader>
        <CardContent>
          {inboundOrders.length > 0 ? (
            <div className="space-y-4">
              {inboundOrders.map((order) => (
                <div key={order.order_id} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Order #{order.order_id.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.line_items.length} items • ${order.total_cost.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={order.status === 'IN_TRANSIT' ? 'outline' : 'secondary'}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      {order.shipping_details.tracking_numbers.length > 0 && (
                        <span className="text-xs font-mono">
                          {order.shipping_details.tracking_numbers[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye size={16} />
                      View Details
                    </Button>
                    <ReceivingDialog order={order} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending shipments</h3>
              <p className="text-muted-foreground">
                All orders have been received or are not yet shipped.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Receiving Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Receiving Activity</CardTitle>
          <CardDescription>Latest items received</CardDescription>
        </CardHeader>
        <CardContent>
          {(receivingEntries || []).length > 0 ? (
            <div className="space-y-3">
              {(receivingEntries || []).slice(-10).reverse().map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{getProductName(entry.product_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      Order #{entry.order_id.slice(-6)} • 
                      Received {entry.received_quantity} via {entry.receiving_mode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.received_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {entry.discrepancy_reason ? (
                      <Badge variant="destructive" className="text-xs">
                        <Warning size={12} className="mr-1" />
                        Discrepancy
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle size={12} className="mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No receiving activity</h3>
              <p className="text-muted-foreground">
                Start receiving shipments to see activity here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}