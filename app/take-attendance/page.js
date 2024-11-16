"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQRCode } from 'next-qrcode';
import { flushSync } from "react-dom";

export default function Page() {
  const searchParams = useSearchParams();
  const tableName = searchParams.get("table");
  const { Canvas } = useQRCode()
  const [qrSize, setQrSize] = useState(200); // Default size to avoid issues during SSR
  useEffect(() => {
    // Update the QR code size after the component has mounted
    const updateQrSize = () => {
      setQrSize(Math.min(window.innerWidth, window.innerHeight) * 0.8);
    };

    updateQrSize(); // Set size on initial mount
    window.addEventListener("resize", updateQrSize); // Update size on window resize

    return () => {
      window.removeEventListener("resize", updateQrSize);
    };
  }, []);

  const [sessionID, setSessionID] = useState(null);
  const [randomID, setRandomID] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tableName) {
      setError("Table name is required.");
      return;
    }

    // Open WebSocket connection
    const socket = new WebSocket(`ws://localhost:6969/create-attendance-session?table=${tableName}`);

    socket.onopen = () => {
      console.log("WebSocket connection established.");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.sessionID) {
          // force rerender immediately
          flushSync(() => {
            setSessionID(data.sessionID);
          })
        }

        if (data.ID) {
          // force rerender immediately
          flushSync(() => {
            setRandomID(data.ID);
          })
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

    // Clean up on component unmount
    return () => {
      socket.close();
    };
  }, [tableName]);

  const qrData = sessionID && randomID ? `${sessionID},${randomID}` : "Loading...";

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Attendance Session</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!error && (
        <>
          <p>
            <strong>Table Name:</strong> {tableName}
          </p>
          <p>
            <strong>Session ID:</strong> {sessionID || "Loading..."}
          </p>
          <p>
            <strong>Current Random ID:</strong> {randomID || "Loading..."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
            <Canvas
              text={qrData}
              options={{
                errorCorrectionLevel: "M",
                margin: 0,
                width: qrSize, // Dynamically set QR size
                color: {
                  dark: "#000000",
                  light: "#ffffff",
                },
              }}
              style={{ maxWidth: "90vw", maxHeight: "90vh", width: "auto", height: "auto" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
