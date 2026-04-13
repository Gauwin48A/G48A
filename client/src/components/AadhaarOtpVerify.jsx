import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildApiPath } from "@/lib/networkConfig";

function AadhaarOtpVerify({ onVerified, onError }) {
  const [aadhaar, setAadhaar] = useState("");
  const [maskedAadhaar, setMaskedAadhaar] = useState("");
  const [stage, setStage] = useState("input");
  const [txnId, setTxnId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const maskAadhaar = (value) => "XXXX XXXX " + value.slice(-4);

  const handleAadhaarChange = useCallback((e) => {
    setAadhaar(e.target.value.replace(/\D/g, ""));
  }, []);

  const handleOtpChange = useCallback((e) => {
    setOtp(e.target.value.replace(/\D/g, ""));
  }, []);

  const sendOtp = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch(buildApiPath("/aadhaar/send-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aadhaar }),
    });
    const data = await response.json();

    setLoading(false);

    if (data.success) {
      setTxnId(data.txnId);
      setMaskedAadhaar(maskAadhaar(aadhaar));
      setStage("otp");
      setCountdown(60);
      setCanResend(false);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError(data.message || "Failed to send OTP");
    }
  }, [aadhaar]);

  const verifyOtp = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch(buildApiPath("/aadhaar/verify-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aadhaar, otp, txnId }),
    });
    const data = await response.json();

    setLoading(false);

    if (data.verified) {
      setStage("verified");
      onVerified && onVerified(data);
    } else {
      setError(data.message || "Verification failed");
      onError && onError(data);
    }
  }, [aadhaar, otp, txnId, onVerified, onError]);

  return (
    <div className="space-y-4">
      {stage === "input" && (
        <div>
          <Label htmlFor="aadhaar">Aadhaar Number</Label>
          <Input
            id="aadhaar"
            maxLength={12}
            minLength={12}
            pattern="\d{12}"
            value={aadhaar}
            onChange={handleAadhaarChange}
            placeholder="Enter 12-digit Aadhaar"
          />
          <Button
            className="mt-2"
            onClick={sendOtp}
            disabled={aadhaar.length !== 12 || loading}
          >
            Send OTP
          </Button>
          {error && (
            <div className="text-red-500 text-sm mt-1">{error}</div>
          )}
        </div>
      )}

      {stage === "otp" && (
        <div>
          <div className="mb-2">
            OTP sent to mobile linked with Aadhaar {maskedAadhaar}
          </div>
          <Label htmlFor="otp">Enter OTP</Label>
          <Input
            id="otp"
            maxLength={6}
            value={otp}
            onChange={handleOtpChange}
            placeholder="Enter 6-digit OTP"
          />
          <Button
            className="mt-2"
            onClick={verifyOtp}
            disabled={otp.length !== 6 || loading}
          >
            Verify
          </Button>
          <div className="mt-2 text-gray-500 text-xs">
            {countdown > 0 ? (
              `Resend OTP in ${countdown}s`
            ) : (
              <Button size="sm" onClick={sendOtp} disabled={!canResend}>
                Resend OTP
              </Button>
            )}
          </div>
          {error && (
            <div className="text-red-500 text-sm mt-1">{error}</div>
          )}
        </div>
      )}

      {stage === "verified" && (
        <div className="text-green-600 font-bold">
          Aadhaar verified successfully!
        </div>
      )}
    </div>
  );
}

export default AadhaarOtpVerify;
