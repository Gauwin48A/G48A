import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import './KycVerification.css'; // Assuming you have or will create CSS

const KycVerification = () => {
    const [formData, setFormData] = useState({
        aadhaar_number: '',
        pan_number: '',
        kyc_front: null,
        kyc_back: null
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [kycStatus, setKycStatus] = useState(null);

    useEffect(() => {
        // Fetch current status
        axios.get('/users/kyc/status')
            .then(res => setKycStatus(res.data))
            .catch(err => console.log('KYC Status fetch failed', err));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        const data = new FormData();
        data.append('aadhaar_number', formData.aadhaar_number);
        data.append('pan_number', formData.pan_number);
        if (formData.kyc_front) data.append('kyc_front', formData.kyc_front);
        if (formData.kyc_back) data.append('kyc_back', formData.kyc_back);

        try {
            const res = await axios.post('/users/kyc/submit', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(res.data.message);
            setKycStatus({ ...kycStatus, status: res.data.status });
        } catch (err) {
            setError(err.response?.data?.error || 'KYC submission failed');
        } finally {
            setLoading(false);
        }
    };

    if (kycStatus?.status === 'VERIFIED') {
        return (
            <div className="kyc-container">
                <div className="kyc-success-card">
                    <h2>✅ KYC Verified</h2>
                    <p>Your identity has been verified. You have full access.</p>
                </div>
            </div>
        );
    }

    if (kycStatus?.status === 'PENDING') {
        return (
            <div className="kyc-container">
                <div className="kyc-pending-card">
                    <h2>⏳ Verification Pending</h2>
                    <p>We are reviewing your documents. This usually takes 24 hours.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="kyc-container">
            <h1>Identity Verification (KYC)</h1>
            {kycStatus?.rejection_reason && (
                <div className="error-banner">
                    Request Rejected: {kycStatus.rejection_reason}
                </div>
            )}

            <form onSubmit={handleSubmit} className="kyc-form">
                <div className="form-group">
                    <label>Aadhaar Number</label>
                    <input
                        type="text"
                        name="aadhaar_number"
                        value={formData.aadhaar_number}
                        onChange={handleChange}
                        placeholder="XXXX-XXXX-XXXX"
                        pattern="\d{12}"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>PAN Number</label>
                    <input
                        type="text"
                        name="pan_number"
                        value={formData.pan_number}
                        onChange={handleChange}
                        placeholder="ABCDE1234F"
                        pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                        required
                    />
                </div>

                <div className="form-group file-group">
                    <label>ID Proof (Front)</label>
                    <input type="file" name="kyc_front" onChange={handleFileChange} accept="image/*" required />
                </div>

                <div className="form-group file-group">
                    <label>ID Proof (Back)</label>
                    <input type="file" name="kyc_back" onChange={handleFileChange} accept="image/*" required />
                </div>

                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                <button type="submit" disabled={loading} className="kyc-submit-btn">
                    {loading ? 'Submitting...' : 'Submit Documents'}
                </button>
            </form>

            <style>{`
                .kyc-container { max-width: 500px; margin: 2rem auto; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .kyc-form { display: flex; flex-direction: column; gap: 1.5rem; }
                .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .form-group input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
                .kyc-submit-btn { background: #007bff; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; }
                .kyc-submit-btn:disabled { background: #ccc; }
                .error-message { color: red; margin: 0; }
                .success-message { color: green; margin: 0; }
                .error-banner { background: #ffebee; color: #c62828; padding: 10px; border-radius: 6px; margin-bottom: 20px; }
                .kyc-success-card, .kyc-pending-card { text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; }
            `}</style>
        </div>
    );
};

export default KycVerification;
