"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQRCode } from 'next-qrcode'
import { flushSync } from "react-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Smartphone } from 'lucide-react'


export default function Page() {
  const searchParams = useSearchParams()
  const tableName = searchParams.get("table")
  const { Canvas } = useQRCode()
  const [qrSize, setQrSize] = useState(400)
  const [sessionID, setSessionID] = useState(null)
  const [randomID, setRandomID] = useState(null)
  const [error, setError] = useState(null)
  const [absentees, setAbsentees] = useState([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    const updateQrSize = () => {
      const height = window.innerHeight * 0.8
      const width = window.innerWidth * 0.7
      setQrSize(Math.min(height, width))
    }

    checkMobile()
    updateQrSize()
    window.addEventListener("resize", checkMobile)
    window.addEventListener("resize", updateQrSize)

    return () => {
      window.removeEventListener("resize", checkMobile)
      window.removeEventListener("resize", updateQrSize)
    }
  }, [])

  useEffect(() => {
    if (!tableName) {
      setError("Classroom name is required.")
      return
    }

    const socket = new WebSocket(`wss://attendance.anuragrao.site/api/create-attendance-session?table=${tableName}`)

    socket.onopen = () => {
      console.log("WebSocket connection established.")
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.sessionID) {
          flushSync(() => {
            setSessionID(data.sessionID)
          })
        }

        if (data.ID) {
          flushSync(() => {
            setRandomID(data.ID)
          })
        }

        if (data.absentees) {
          flushSync(() => {
            setAbsentees(data.absentees)
          })
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err)
      }
    }

    socket.onerror = (err) => {
      console.error("WebSocket error:", err)
      setError("Failed to establish WebSocket connection.")
    }

    socket.onclose = () => {
      console.log("WebSocket connection closed.")
    }

    return () => {
      socket.close()
    }
  }, [tableName])

  const qrData = sessionID && randomID ? `${sessionID},${randomID}` : "Loading..."

  return (
    <div className="px-2 py-4 h-screen">
      {isMobile && (
        <Alert variant="warning" className="mb-4">
          <Smartphone className="h-4 w-4" />
          <AlertTitle>Mobile Device Detected</AlertTitle>
          <AlertDescription>
            This page is optimized for laptop screens. Some features may not display correctly on mobile devices.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex h-full">
        <Card className="w-3/4 mr-1">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Attendance QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[calc(100%-4rem)] p-1">
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="mb-4 text-center">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Classroom</h3>
                  <p className="text-lg font-semibold">{tableName || <Skeleton className="h-6 w-24 mx-auto" />}</p>
                </div>
                <div className="flex justify-center items-center bg-muted rounded-lg w-full h-full">
                  {qrData !== "Loading..." ? (
                    <Canvas
                      text={qrData}
                      options={{
                        errorCorrectionLevel: "M",
                        margin: 2,
                        width: qrSize,
                        height: qrSize,
                        color: {
                          dark: "#000000",
                          light: "#ffffff",
                        },
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center space-y-4">
                      <Skeleton className="h-48 w-48" />
                      <p className="text-muted-foreground">Generating QR Code...</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="w-1/4 ml-1">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Absentees</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)] overflow-y-auto p-1">
            {absentees.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {absentees.map((absentee) => (
                  <div key={absentee.SRN} className="bg-muted rounded-lg p-2 text-center">
                    <div className="text-4xl font-bold">
                      {absentee.SRN.slice(-3)}
                    </div>
                    <div className="text-xs truncate mt-1">
                      {absentee.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No absentees to display.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
