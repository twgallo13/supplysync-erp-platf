import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, Flashlight, ArrowLeft, Keyboard, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { haptics } from '@/lib/haptics'

interface MobileScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
  isOpen: boolean
}

export function MobileScanner({ onScan, onClose, isOpen }: MobileScannerProps) {
  const [flashOn, setFlashOn] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [lastScanTime, setLastScanTime] = useState<number>(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Prevent rapid duplicate scans
  const SCAN_COOLDOWN = 2000 // 2 seconds

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera for barcode scanning
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
        haptics.light() // Light haptic when camera starts successfully
        
        // Start auto-focus attempt
        const track = stream.getVideoTracks()[0]
        if (track && 'applyConstraints' in track) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any]
            })
          } catch (e) {
            console.debug('Focus constraint not supported')
          }
        }
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      setCameraError('Camera access denied. Please enable camera permissions in your browser settings.')
      haptics.error() // Error haptic for camera failure
      toast.error('Camera access denied. Please enable camera permissions.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
    }
    setIsScanning(false)
    setFlashOn(false)
    setCameraError(null)
  }, [])

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return

    const track = streamRef.current.getVideoTracks()[0]
    if (track && 'applyConstraints' in track) {
      try {
        const capabilities = track.getCapabilities?.() as any
        if (capabilities?.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !flashOn } as any]
          })
          setFlashOn(!flashOn)
          haptics.select() // Light haptic for UI interaction
          toast.success(flashOn ? 'Flash turned off' : 'Flash turned on')
        } else {
          haptics.warning() // Warning haptic for unsupported feature
          toast.warning('Flash not supported on this device')
        }
      } catch (error) {
        console.error('Flash not supported:', error)
        haptics.error() // Error haptic for unsupported feature
        toast.error('Flash control failed')
      }
    }
  }, [flashOn])

  const handleManualEntry = () => {
    const barcode = prompt('Enter barcode manually:')
    if (barcode?.trim()) {
      haptics.scanSuccess() // Success haptic for manual entry
      onScan(barcode.trim())
      handleClose()
    } else if (barcode === '') {
      haptics.warning() // Warning haptic for empty input
      toast.warning('Please enter a valid barcode')
    }
  }

  const handleClose = () => {
    haptics.light() // Light haptic for closing scanner
    stopCamera()
    onClose?.()
  }

  // Simulate barcode detection with debouncing (in real implementation, use a barcode scanning library)
  const simulateScan = (type: 'success' | 'error' = 'success') => {
    const now = Date.now()
    if (now - lastScanTime < SCAN_COOLDOWN) {
      haptics.warning()
      toast.warning('Please wait before scanning again')
      return
    }

    if (type === 'error') {
      simulateScanError()
      return
    }

    const mockBarcodes = [
      '012345678905',
      '123456789012', 
      '987654321098',
      'SKU-GL-085-001',
      'WH-ITEM-2024-001'
    ]
    const randomBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)]
    
    // Success haptic feedback for successful scan
    haptics.scanSuccess()
    setLastScanTime(now)
    
    onScan(randomBarcode)
    handleClose()
    toast.success(`Scanned: ${randomBarcode}`)
  }

  // Simulate scan error (for demo purposes)
  const simulateScanError = () => {
    haptics.scanError() // Error haptic for scan failure
    toast.error('Unable to read barcode. Please try again or use manual entry.')
  }

  // Auto-start camera when scanner opens
  useEffect(() => {
    if (isOpen && !isScanning && !cameraError) {
      startCamera()
    }
    return () => {
      if (!isOpen) {
        stopCamera()
      }
    }
  }, [isOpen, startCamera, stopCamera, isScanning, cameraError])

  // Keep screen awake during scanning
  useEffect(() => {
    if (isOpen && 'wakeLock' in navigator) {
      let wakeLock: any = null
      const acquireWakeLock = async () => {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        } catch (err) {
          console.debug('Wake lock failed:', err)
        }
      }
      acquireWakeLock()
      
      return () => {
        if (wakeLock) {
          wakeLock.release()
        }
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black safe-area">
      {/* Camera View */}
      <div className="relative h-full w-full">
        {cameraError ? (
          // Error State
          <div className="h-full w-full flex items-center justify-center bg-black">
            <Card className="m-4 p-6 text-center max-w-sm">
              <Warning size={48} className="text-destructive mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Camera Access Required</h3>
              <p className="text-sm text-muted-foreground mb-4">{cameraError}</p>
              <div className="space-y-2">
                <Button onClick={startCamera} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleManualEntry} className="w-full">
                  Manual Entry
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              onLoadedMetadata={() => {
                if (videoRef.current && !isScanning) {
                  startCamera()
                }
              }}
            />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Scan Frame - Optimized for warehouse lighting */}  
                <div className="w-72 h-52 border-2 border-white/80 rounded-xl relative shadow-2xl">
                  {/* Corner indicators */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl shadow-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl shadow-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl shadow-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl shadow-lg" />
                  
                  {/* Scanning Line Animation */}
                  <div className="absolute inset-0 overflow-hidden rounded-xl">
                    <div 
                      className="w-full h-1 bg-primary shadow-lg opacity-80"
                      style={{ 
                        animation: 'scanLine 2s ease-in-out infinite',
                        transform: 'translateY(0px)'
                      }} 
                    />
                  </div>
                  
                  {/* Center crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary/60 rounded-full">
                      <div className="w-2 h-2 bg-primary rounded-full m-auto mt-1" />
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-6 space-y-2">
                  <p className="text-white text-lg font-medium drop-shadow-lg">
                    Position barcode within frame
                  </p>
                  <p className="text-white/80 text-sm drop-shadow">
                    Hold steady for automatic scan
                  </p>
                  {lastScanTime > 0 && (
                    <Badge className="bg-black/50 text-white border-white/20">
                      Ready to scan again
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center safe-top">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="bg-black/60 text-white hover:bg-black/80 rounded-full h-12 w-12 shadow-lg"
          >
            <X size={24} />
          </Button>
          
          <div className="flex items-center gap-2">
            {isScanning && (
              <Badge className="bg-green-500/20 text-green-100 border-green-400/30">
                Camera Active
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFlash}
            disabled={!isScanning}
            className={cn(
              "rounded-full h-12 w-12 shadow-lg",
              flashOn 
                ? "bg-amber-500/20 text-amber-100 hover:bg-amber-500/30" 
                : "bg-black/60 text-white hover:bg-black/80"
            )}
          >
            <Flashlight size={24} weight={flashOn ? "fill" : "regular"} />
          </Button>
        </div>

        {/* Bottom Controls - Warehouse optimized */}
        <div className="absolute bottom-0 left-0 right-0 p-6 safe-bottom">
          <div className="flex gap-3 justify-center max-w-md mx-auto">
            {/* Primary Scan Button */}
            <Button
              onClick={() => simulateScan('success')}
              disabled={!isScanning || (Date.now() - lastScanTime < SCAN_COOLDOWN)}
              className="bg-primary text-primary-foreground rounded-full h-16 px-8 text-lg font-semibold shadow-2xl min-w-[140px] touch-manipulation"
            >
              <Camera size={24} className="mr-2" />
              Scan
            </Button>
            
            {/* Secondary Actions */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => simulateScan('error')}
                variant="destructive"
                size="sm"
                className="rounded-full h-7 px-4 text-xs shadow-lg"
              >
                Test Error
              </Button>
              
              <Button
                variant="outline"
                onClick={handleManualEntry}
                size="sm"
                className="bg-white/90 text-black border-white/90 rounded-full h-7 px-4 text-xs shadow-lg"
              >
                <Keyboard size={12} className="mr-1" />
                Manual
              </Button>
            </div>
          </div>
          
          {/* Tips for warehouse use */}
          <div className="text-center mt-4">
            <p className="text-white/60 text-xs">
              For best results: ensure good lighting, hold device steady, clean camera lens
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}