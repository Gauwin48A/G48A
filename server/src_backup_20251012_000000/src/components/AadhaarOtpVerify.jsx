import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AadhaarOtpVerify({ onVerified, onError }) {
  const [aadhaar, setAadhaar] = useState('');
  const [masked, setMasked] = useState('');
  const [step, setStep] = useState('input'); // input | otp | verified
  const [txnId, setTxnId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Mask Aadhaar for display
  const maskAadhaar = (aadhaar) => 'XXXX XXXX ' + aadhaar.slice(-4);

  // Send OTP
  const handleSendOtp = async () => {
    setLoading(true); setError('');
    const res = await fetch('/api/aadhaar/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaar })
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setTxnId(data.txnId);
      setMasked(maskAadhaar(aadhaar));
      setStep('otp');
      setTimer(60); setCanResend(false);
      const interval = setInterval(() => setTimer(t => {
        if (t <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return t - 1;
      }), 1000);
    } else {
      setError(data.message || 'Failed to send OTP');
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    setLoading(true); setError('');
    const res = await fetch('/api/aadhaar/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaar, otp, txnId })
    });
    const data = await res.json();
    setLoading(false);
    if (data.verified) {
      setStep('verified');
      onVerified && onVerified(data);
    } else {
      setError(data.message || 'Verification failed');
      onError && onError(data);
    }
  };

  return (
    <div className="space-y-4">
      {step === 'input' && (
        <div>
          <Label htmlFor="aadhaar">Aadhaar Number</Label>
          <Input id="aadhaar" maxLength={12} minLength={12} pattern="\d{12}" value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, ''))} placeholder="Enter 12-digit Aadhaar" />
          <Button className="mt-2" onClick={handleSendOtp} disabled={aadhaar.length !== 12 || loading}>Send OTP</Button>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>
      )}
      {step === 'otp' && (
        <div>
          <div className="mb-2">OTP sent to mobile linked with Aadhaar {masked}</div>
          <Label htmlFor="otp">Enter OTP</Label>
          <Input id="otp" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="Enter 6-digit OTP" />
          <Button className="mt-2" onClick={handleVerifyOtp} disabled={otp.length !== 6 || loading}>Verify</Button>
          <div className="mt-2 text-gray-500 text-xs">{timer > 0 ? `Resend OTP in ${timer}s` : <Button size="sm" onClick={handleSendOtp} disabled={!canResend}>Resend OTP</Button>}</div>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>
      )}
      {step === 'verified' && (
        <div className="text-green-600 font-bold">Aadhaar verified successfully!</div>
      )}
    </div>
  );
}
