"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQRCode } from 'next-qrcode'
import { flushSync } from "react-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Smartphone } from 'lucide-react'
import { Profiler } from 'react'

let socket
let isFirstRandomID = true
export default function Page() {
  const searchParams = useSearchParams()
  const tableName = searchParams.get("table")
  const { Canvas } = useQRCode()
  const [qrSize, setQrSize] = useState(400)
  const [sessionID, setSessionID] = useState(null)
  const [randomID, setRandomID] = useState(null)
  const [error, setError] = useState(null)
  const [absentees, setAbsentees] = useState([])
  const [presentees, setPresentees] = useState([])
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


  const sendAckForLatencyCalibration = async () => {
    console.log("Sending ACK")
    socket.send(JSON.stringify({
      type: "latency",
      message: 1
    }))
  }

  useEffect(() => {
    if (!tableName) {
      setError("Classroom name is required.")
      return
    }

    socket = new WebSocket(`wss://attendance.anuragrao.site/api/create-attendance-session?table=${tableName}`)
    // const socket = new WebSocket(`ws://localhost:6969/create-attendance-session?table=${tableName}`)

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
          if (isFirstRandomID) {
            isFirstRandomID = false
            sendAckForLatencyCalibration()
          }
          flushSync(() => {
            setRandomID(data.ID)
            // react does some fancy optimization to not make this
            // a performance hit. so we don't have to worry about it
          })
        }

        if (data.absentees) {
          flushSync(() => {
            setAbsentees(data.absentees)
          })
        }

        if (data.presentees) {
          flushSync(() => {
            setPresentees(data.presentees)
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

  const qrData = randomID ? `${sessionID},${randomID}` : "Loading..."

  const StudentList = ({ students }) => (
    <div className="grid grid-cols-2 gap-2">
      {students.map((student) => (
        <div key={student.SRN} className="bg-muted rounded-lg p-2 text-center">
          <div className="text-4xl font-bold">
            {student.SRN.slice(-3)}
          </div>
          <div className="text-xs truncate mt-1">
            {student.name}
          </div>
        </div>
      ))}
    </div>
  )

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
                    <Profiler id="QRCode" onRender={QRRenderHandler}>
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
                    </Profiler>
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
          <Tabs defaultValue="absentees" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="absentees">Absentees</TabsTrigger>
              <TabsTrigger value="presentees">Presentees</TabsTrigger>
            </TabsList>
            <TabsContent value="absentees">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Absentees</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100vh-12rem)] overflow-y-auto p-1">
                {absentees.length > 0 ? (
                  <StudentList students={absentees} />
                ) : (
                  <p className="text-center text-muted-foreground">No absentees to display.</p>
                )}
              </CardContent>
            </TabsContent>
            <TabsContent value="presentees">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Presentees</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100vh-12rem)] overflow-y-auto p-1">
                {presentees.length > 0 ? (
                  <StudentList students={presentees} />
                ) : (
                  <p className="text-center text-muted-foreground">No presentees to display.</p>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}


function QRRenderHandler(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  if (phase == "mount") {
    // send the base render time (worst case render time to the backend for drift caluclation)
    console.log("Base render time:", baseDuration)
    socket.send(JSON.stringify({
      type: "baseRenderTime",
      message: Math.ceil(baseDuration)
    }))
  }
}
