"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Scanner as ScannerComp } from '@yudiel/react-qr-scanner'
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const fpPromise = FingerprintJS.load()

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const srn = searchParams.get("srn")

  const [socket, setSocket] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState("connecting")
  const [errorMessage, setErrorMessage] = useState(null)
  const [deviceTimestamp, setDeviceTimestamp] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState("")

  useEffect(() => {
    const socket = new WebSocket("wss://attendance.anuragrao.site/api/scan-qr")

    socket.onopen = async () => {
      setConnectionStatus("connected")
      const fp = await fpPromise
      const result = await fp.get()
      const fingerprintHash = result.visitorId

      const timestamp = Date.now()
      setDeviceTimestamp(timestamp)
      socket.send(
        JSON.stringify({
          type: "INIT",
          srn: srn,
          clientTime: timestamp.toString(),
          browserFingerprint: fingerprintHash
        })
      )
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log(data)
      if (data.status === "OK") {
        setDialogMessage("Attendance marked successfully.")
        setIsDialogOpen(true)
        setErrorMessage(null)
      }
      if (data.status == "error" && data.message == "Invalid browser fingerprint") {
        setDialogMessage("Please use the same device AND browser for giving attendance.")
        setTimeout(() => {
          router.back()
        }, 2000)
        setIsDialogOpen(true)
      }
      if (data.status == "error" && data.message == "Student already marked present") {
        setDialogMessage("You are already marked present for this session. You don't have to scan again.")
        setIsDialogOpen(true)
      }
    }

    socket.onerror = () => {
      setConnectionStatus("error")
    }

    socket.onclose = () => {
      setConnectionStatus("closed")
    }

    setSocket(socket)

    return () => {
      socket.close()
    }
  }, [searchParams])

  const handleScan = (data) => {
    if (data) {
      let [sessionID, scannedRandomID] = data.split(",")
      sessionID = parseInt(sessionID)
      scannedRandomID = parseInt(scannedRandomID)
      if (deviceTimestamp) {
        const scannedAt = Date.now()
        socket.send(
          JSON.stringify({
            sessionID: sessionID,
            scannedRandomID: scannedRandomID,
            scannedAt: scannedAt.toString(),
            SRN: srn,
          })
        )
      }
    }
  }

  const handleError = (err) => {
    console.error(err)
    setErrorMessage("Error scanning QR code.")
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    router.back()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Scan QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ConnectionStatus status={connectionStatus} />
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-lg shadow-lg">
              <ScannerComp
                formats={['qr_code']}
                onScan={(detectedCodes) => {
                  const data = detectedCodes[0]?.rawValue
                  if (data) handleScan(data)
                }}
                onError={handleError}
                components={{
                  audio: false,
                  onOff: false,
                  torch: false,
                  zoom: true,
                  finder: true,
                }}
                allowMultiple={false}
              />
              <div className="absolute inset-0 border-4 border-blue-500 opacity-50 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attention Required</DialogTitle>
            <DialogDescription>{dialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleDialogClose}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConnectionStatus({ status }) {
  const statusConfig = {
    connecting: { icon: Loader2, color: "text-yellow-500", text: "Connecting..." },
    connected: { icon: CheckCircle, color: "text-green-500", text: "Connected" },
    error: { icon: AlertCircle, color: "text-red-500", text: "Connection Error" },
    closed: { icon: AlertCircle, color: "text-gray-500", text: "Connection Closed" },
  }

  const { icon: Icon, color, text } = statusConfig[status]

  return (
    <div className={`flex items-center justify-center space-x-2 ${color}`}>
      <Icon className={`h-5 w-5 ${status === 'connecting' ? 'animate-spin' : ''}`} />
      <span className="font-medium">{text}</span>
    </div>
  )
}
