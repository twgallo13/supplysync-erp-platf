import { useState, useRef, useCallback } from 'react'
import { Camera, X, Flashlight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
        haptics.light() // Light haptic when camera starts
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      haptics.error() // Error haptic for camera failure
      toast.error('Camera access denied. Please enable camera permissions.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
    setFlashOn(false)
  }, [])

  const toggleFlash = useCallback(async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0]
      if (track && 'applyConstraints' in track) {
        try {
          // Note: Flash control implementation varies by browser/device
          setFlashOn(!flashOn)
          haptics.select() // Light haptic for UI interaction
          toast.success(flashOn ? 'Flash turned off' : 'Flash turned on')
        } catch (error) {
          console.error('Flash not supported:', error)
          haptics.error() // Error haptic for unsupported feature
          toast.error('Flash not supported on this device')
        }
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
    }
  }

  const handleClose = () => {
    haptics.light() // Light haptic for closing scanner
    stopCamera()
    onClose?.()
  }

  // Simulate barcode detection (in real implementation, use a barcode scanning library)
  const simulateScan = () => {
    const mockBarcodes = [
      '012345678905',
      '123456789012',
      '987654321098',
      'SKU-GL-085-001'
    ]
    const randomBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)]
    
    // Success haptic feedback for successful scan
    haptics.scanSuccess()
    
    onScan(randomBarcode)
    handleClose()
    toast.success(`Scanned: ${randomBarcode}`)
  }

  // Simulate scan error (for demo purposes)
  const simulateScanError = () => {
    haptics.scanError() // Error haptic for scan failure
    toast.error('Unable to read barcode. Please try again or use manual entry.')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera View */}
      <div className="relative h-full w-full">
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
            {/* Scan Frame */}
            <div className="w-64 h-48 border-2 border-white rounded-lg relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              
              {/* Scanning Line Animation */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="w-full h-0.5 bg-primary shadow-lg animate-pulse" 
                     style={{ 
                       animation: 'scanLine 2s ease-in-out infinite',
                       transform: 'translateY(0px)'
                     }} />
              </div>
            </div>
            
            <p className="text-white text-center mt-4 text-sm">
              Position barcode within the frame
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="bg-black/50 text-white hover:bg-black/70 rounded-full h-12 w-12"
          >
            <X size={24} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFlash}
            className="bg-black/50 text-white hover:bg-black/70 rounded-full h-12 w-12"
          >
            {flashOn ? <Flashlight size={24} weight="fill" /> : <Flashlight size={24} />}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex gap-4 justify-center">
            {/* Demo Scan Button */}
            <Button
              onClick={simulateScan}
              className="bg-primary text-primary-foreground rounded-full h-14 px-8"
            >
              Simulate Scan
            </Button>
            
            {/* Demo Error Button */}
            <Button
              onClick={simulateScanError}
              variant="destructive"
              className="rounded-full h-14 px-6"
            >
              Test Error
            </Button>
            
            <Button
              variant="outline"
              onClick={handleManualEntry}
              className="bg-white/90 text-black border-white/90 rounded-full h-14 px-6"
            >
              Manual Entry
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}