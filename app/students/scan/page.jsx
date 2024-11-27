"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Scanner as ScannerComp, outline } from "@yudiel/react-qr-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Page() {
  const router = useRouter();

  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [errorMessage, setErrorMessage] = useState(null);
  const [deviceTimestamp, setDeviceTimestamp] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    try {
      const loginResponse = await fetch("/api/auth/login/begin", {
        method: "POST",
        credentials: "include",
      });
      if (!loginResponse.ok) {
        throw new Error("Failed to fetch authentication options");
      }

      const loginOptions = await loginResponse.json();
      console.log(loginOptions.publicKey)

      const assertionResponse = await startAuthentication({
        optionsJSON: loginOptions.publicKey,
      });

      console.log("assertion over")

      const verifyResponse = await fetch("/api/auth/login/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assertionResponse),
      });

      if (!verifyResponse.ok) {
        throw new Error("WebAuthn login failed");
      }

      setAuthenticated(true);
    } catch (error) {
      console.error(error);
      setErrorMessage("Biometric authentication failed. Please try again.");
      router.push("/students");
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    const socket = new WebSocket("wss://attendance.anuragrao.site/api/scan-qr")
    // const socket = new WebSocket("ws://localhost:6969/scan-qr");

    socket.onopen = () => {
      setConnectionStatus("connected");
      const timestamp = Date.now();
      setDeviceTimestamp(timestamp);
      socket.send(
        JSON.stringify({
          type: "INIT",
          clientTime: timestamp.toString(),
        })
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.status === "OK") {
        setDialogMessage("Attendance marked successfully.");
        setIsDialogOpen(true);
        setErrorMessage(null);
      } else if (
        data.status === "error" &&
        data.message === "Student already marked present"
      ) {
        setDialogMessage(
          "You are already marked present for this session. You don't have to scan again."
        );
        setIsDialogOpen(true);
      } else if (data.status === "error") {
        setErrorMessage(data.message || "An unknown error occurred.");
      }
    };

    socket.onerror = () => {
      setConnectionStatus("error");
      setErrorMessage("WebSocket connection error. Please try again.");
    };

    socket.onclose = () => {
      setConnectionStatus("closed");
    };

    setSocket(socket);

    return () => {
      socket.close();
    };
  }, [authenticated]);

  const handleScan = (data) => {
    if (data) {
      setConnectionStatus("scanning");
      const IDs = data.split("?")[1] // index 0 will be the URL
      const [sessionID, scannedRandomID] = IDs.split(",");
      if (deviceTimestamp) {
        const scannedAt = Date.now();
        socket.send(
          JSON.stringify({
            sessionID: parseInt(sessionID),
            scannedRandomID: parseInt(scannedRandomID),
            scannedAt: scannedAt.toString(),
          })
        );
      }
    }
  };

  const handleError = (err) => {
    console.error(err);
    setErrorMessage("Error scanning QR code.");
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    router.back();
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Authenticate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-center">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleAuthenticate}
                disabled={isAuthenticating}
                className="w-full"
              >
                {isAuthenticating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isAuthenticating ? "Authenticating..." : "Start Authentication"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Scan QR Code
          </CardTitle>
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
                formats={["qr_code"]}
                onScan={(detectedCodes) => {
                  const data = detectedCodes[0]?.rawValue;
                  if (data) handleScan(data);
                }}
                onError={handleError}
                components={{
                  audio: false,
                  onOff: false,
                  torch: false,
                  zoom: true,
                  finder: true,
                  tracker: outline,
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
            <DialogTitle>Attention</DialogTitle>
            <DialogDescription>{dialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleDialogClose}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConnectionStatus({ status }) {
  const statusConfig = {
    connecting: { icon: Loader2, color: "text-yellow-500", text: "Connecting..." },
    connected: { icon: CheckCircle, color: "text-green-500", text: "Connected" },
    error: { icon: AlertCircle, color: "text-red-500", text: "Connection Error" },
    closed: { icon: AlertCircle, color: "text-gray-500", text: "Connection Closed" },
    scanning: { icon: Loader2, color: "text-yellow-500", text: "Scanning...Keep the QR in the frame" }
  };

  const { icon: Icon, color, text } = statusConfig[status];

  return (
    <div className={`flex items-center justify-center space-x-2 ${color}`}>
      <Icon className={`h-5 w-5 ${status === "connecting" ? "animate-spin" : ""}`} />
      <span className="font-medium">{text}</span>
    </div>
  );
}
