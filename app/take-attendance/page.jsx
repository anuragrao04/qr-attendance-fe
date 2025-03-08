"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQRCode } from "next-qrcode";
import { flushSync } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Smartphone } from "lucide-react";
import { Profiler } from "react";
import StudentList from "../components/StudentList";

let socket;
let isFirstRandomID = true;
let baseRenderTimeSent = false;

export default function Page() {
  const searchParams = useSearchParams();
  const tableName = searchParams.get("table");
  const { Canvas } = useQRCode();
  const [qrSize, setQrSize] = useState(400);
  const [sessionID, setSessionID] = useState(null);
  const [randomID, setRandomID] = useState(null);
  const [error, setError] = useState(null);
  const [absentees, setAbsentees] = useState([]);
  const [presentees, setPresentees] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    const updateQrSize = () => {
      const height = window.innerHeight * 0.8;
      const width = window.innerWidth * 0.7;
      setQrSize(Math.min(height, width));
    };

    checkMobile();
    updateQrSize();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("resize", updateQrSize);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("resize", updateQrSize);
    };
  }, []);

  const showNotification = useCallback((message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  const sendAckForLatencyCalibration = useCallback(() => {
    console.log("Sending ACK");
    socket.send(
      JSON.stringify({
        type: "latency",
        message: 1,
      }),
    );
  }, []);

  const handleToggleAttendance = useCallback(
    (srn) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "TOGGLE_ATTENDANCE",
            srn: srn,
          }),
        );
        showNotification(`Updating attendance for ${srn.slice(-5)}...`, "info");
      } else {
        setError("WebSocket connection is not open. Please refresh the page.");
      }
    },
    [showNotification],
  );

  useEffect(() => {
    if (!tableName) {
      setError("Classroom name is required.");
      return;
    }

    // socket = new WebSocket(
    //   `wss://attendance.anuragrao.site/api/create-attendance-session?table=${tableName}`,
    // );
    socket = new WebSocket(
      `ws://localhost:6969/create-attendance-session?table=${tableName}`,
    );

    socket.onopen = () => {
      console.log("WebSocket connection established.");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.sessionID) {
          flushSync(() => {
            setSessionID(data.sessionID);
          });
        }

        if (data.ID) {
          if (isFirstRandomID) {
            isFirstRandomID = false;
            sendAckForLatencyCalibration();
          }
          flushSync(() => {
            setRandomID(data.ID);
          });
        }

        if (data.type == "ATTENDANCE_UPDATE") {
          flushSync(() => {
            console.log("Got attendance update: ");
            setPresentees(data.presentees == null ? [] : data.presentees);
            setAbsentees(data.absentees == null ? [] : data.absentees);
          });
        }

        // Handle status messages
        if (data.status === "error" && data.message) {
          setError(data.message);
        }

        if (
          data.status === "OK" &&
          data.message &&
          data.message.includes("toggled")
        ) {
          showNotification(data.message, "success");
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("Failed to establish WebSocket connection.");
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    return () => {
      socket.close();
    };
  }, [tableName, sendAckForLatencyCalibration, showNotification]);

  // Generate QR data - wrapped in useCallback to avoid re-creating this function
  const qrData = randomID
    ? `https://attendance.anuragrao.site/students?${sessionID},${randomID}`
    : "Loading...";

  // Create QR component that only updates when qrData changes
  const QRDisplay = useCallback(
    () => (
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
    ),
    [qrData, qrSize],
  );

  return (
    <div className="px-2 py-4 h-screen">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-opacity duration-300 
          ${notification.type === "error"
              ? "bg-red-100 text-red-800 border-l-4 border-red-500"
              : notification.type === "success"
                ? "bg-green-100 text-green-800 border-l-4 border-green-500"
                : "bg-blue-100 text-blue-800 border-l-4 border-blue-500"
            }`}
        >
          {notification.message}
        </div>
      )}

      {isMobile && (
        <Alert variant="warning" className="mb-4">
          <Smartphone className="h-4 w-4" />
          <AlertTitle>Mobile Device Detected</AlertTitle>
          <AlertDescription>
            This page is optimized for laptop screens. Some features may not
            display correctly on mobile devices.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex h-full">
        <Card className="w-3/4 mr-1">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Attendance QR Code
            </CardTitle>
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
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Classroom
                  </h3>
                  <p className="text-lg font-semibold">
                    {tableName || <Skeleton className="h-6 w-24 mx-auto" />}
                  </p>
                </div>
                <div className="flex justify-center items-center bg-muted rounded-lg w-full h-full">
                  {qrData !== "Loading..." ? (
                    <QRDisplay />
                  ) : (
                    <div className="flex flex-col items-center space-y-4">
                      <Skeleton className="h-48 w-48" />
                      <p className="text-muted-foreground">
                        Generating QR Code...
                      </p>
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
                <CardTitle className="text-2xl font-bold">
                  Absentees{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({absentees.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100vh-12rem)] overflow-y-auto p-1">
                {absentees.length > 0 ? (
                  <StudentList
                    students={absentees}
                    onToggleAttendance={handleToggleAttendance}
                  />
                ) : (
                  <p className="text-center text-muted-foreground">
                    No absentees to display.
                  </p>
                )}
              </CardContent>
            </TabsContent>
            <TabsContent value="presentees">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  Presentees{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({presentees.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100vh-12rem)] overflow-y-auto p-1">
                {presentees.length > 0 ? (
                  <StudentList
                    students={presentees}
                    onToggleAttendance={handleToggleAttendance}
                  />
                ) : (
                  <p className="text-center text-muted-foreground">
                    No presentees to display.
                  </p>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function QRRenderHandler(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) {
  if (phase == "mount" && !baseRenderTimeSent) {
    // send the base render time (worst case render time to the backend for drift caluclation)
    console.log("Base render time:", baseDuration);
    socket.send(
      JSON.stringify({
        type: "baseRenderTime",
        message: Math.ceil(baseDuration),
      }),
    );
    baseRenderTimeSent = true;
  }
}
