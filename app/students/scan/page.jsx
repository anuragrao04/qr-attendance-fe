"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Scanner as ScannerComp, outline } from '@yudiel/react-qr-scanner';
import Image from "next/image";

export default function Page() {


  // enforce chrome browser only
  //
  const [isChrome, setIsChrome] = useState(true);
  function arraysEqual(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((val, index) => val === arr2[index]);
  }
  useEffect(() => {
    const condition = !!window.chrome && arraysEqual(Object.keys(window.chrome), ['loadTimes', 'csi', 'app', 'runtime']);
    if (!condition) {
      // it's not chrome
      setIsChrome(false)
    }
  }, [])


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
    const socket = new WebSocket("wss://attendance.anuragrao.site/api/scan-qr");

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

  if (!isChrome) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6 flex items-center justify-center">
            <Image src="/chrome-icon.png" width={75} height={75} alt="Chrome Icon" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Please Use Google Chrome</h1>
          <p className="text-gray-600 mb-6">
            This website is optimized for Google Chrome. To access the site and enjoy the best experience, please switch to
            Chrome. Incognito mode is not supported.
          </p>
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Download Chrome
          </a>
        </div>
      </div>
    )
  }

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
