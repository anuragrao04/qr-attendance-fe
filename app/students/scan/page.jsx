"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Scanner as ScannerComp, outline } from '@yudiel/react-qr-scanner';


export default function Page() {
  const searchParams = useSearchParams();
  const srn = searchParams.get("srn");

  // WebSocket state
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [errorMessage, setErrorMessage] = useState(null);

  // Store the current timestamp of student's device (sent on first connection)
  const [deviceTimestamp, setDeviceTimestamp] = useState(null);

  useEffect(() => {
    // Connect to the WebSocket
    const socket = new WebSocket("ws://localhost:6969/scan-qr");

    socket.onopen = () => {
      setConnectionStatus("Connected");

      // Send the student's device timestamp on connection to help calculate drift
      const timestamp = Date.now();
      setDeviceTimestamp(timestamp);
      socket.send(
        JSON.stringify({
          type: "INIT",
          srn: srn,
          clientTime: timestamp.toString(),
        })
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === "OK") {
        setErrorMessage(null); // Clear error message if successful
      } else if (data.status === "NOT_OK") {
        setErrorMessage("Scan failed. Please try again.");
      }
    };

    socket.onerror = () => {
      setConnectionStatus("Error connecting to WebSocket");
    };

    socket.onclose = () => {
      setConnectionStatus("Connection closed");
    };

    setSocket(socket);

    // Cleanup the WebSocket connection when the component is unmounted
    return () => {
      socket.close();
    };
  }, [searchParams]);

  const handleScan = (data) => {
    if (data) {
      let [sessionID, scannedRandomID] = data.split(",");
      sessionID = parseInt(sessionID);
      scannedRandomID = parseInt(scannedRandomID);
      if (deviceTimestamp) {
        // Get current time at scan
        const scannedAt = Date.now();

        // Send the data to the backend
        socket.send(
          JSON.stringify({
            sessionID: sessionID,
            scannedRandomID: scannedRandomID,
            scannedAt: scannedAt.toString(),
            SRN: srn,
          })
        );
      }
    }
  };

  const handleError = (err) => {
    console.error(err);
    setErrorMessage("Error scanning QR code.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2>Scan the QR Code</h2>
      <div>Status: {connectionStatus}</div>
      {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
      <div style={{ width: "100%", maxWidth: "600px", marginBottom: "20px" }}>
        {/* QR Code Scanner */}
        <ScannerComp
          formats={[
            'qr_code',
          ]}
          onScan={(detectedCodes) => {
            const data = detectedCodes[0].rawValue
            handleScan(data)
          }}
          onError={handleError}
          components={{
            audio: false,
            onOff: false,
            torch: false,
            zoom: true,
            finder: true,
            tracker: outline
          }}
          allowMultiple={false}
        />
      </div>
    </div>
  );
}
