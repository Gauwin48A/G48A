import React, { useState, useEffect } from 'react';
import axios from '../../services/api';

const PaymentPage = () => {
    const [upiDetails, setUpiDetails] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('silver');
    const [transactionId, setTransactionId] = useState('');
    const [status, setStatus] = useState({ loading: false, message: '', error: '' });
    const [history, setHistory] = useState([]);

    useEffect(() => {
        // Fetch UPI Details
        axios.get('/payments/upi-details')
            .then(res => setUpiDetails(res.data))
            .catch(err => console.error('Failed to load payment details'));

        // Fetch History
        axios.get('/payments/status')
            .then(res => setHistory(res.data.payments))
            .catch(err => console.error('Failed to load history'));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, message: '', error: '' });

        try {
            const res = await axios.post('/payments/submit', {
                plan_type: selectedPlan,
                transaction_id: transactionId,
                amount: upiDetails.tiers[selectedPlan].amount
            });
            setStatus({ loading: false, message: res.data.message, error: '' });
            setTransactionId('');
            // Refresh history
            const histRes = await axios.get('/payments/status');
            setHistory(histRes.data.payments);
        } catch (err) {
            setStatus({ loading: false, message: '', error: err.response?.data?.error || 'Submission failed' });
        }
    };

    if (!upiDetails) return <div className="p-4">Loading payment details...</div>;

    const currentPlan = upiDetails.tiers[selectedPlan];
    // Generic UPI String (upi://pay?pa=ADDRESS&pn=NAME&am=AMOUNT&cu=INR)
    const upiLink = `upi://pay?pa=${upiDetails.upi_id}&pn=${encodeURIComponent(upiDetails.merchant_name)}&am=${currentPlan.amount}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

    return (
        <div className="max-w-4xl mx-auto p-6 grid md:grid-cols-2 gap-8">
            {/* LEFT: PAYMENT FORM */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-4">Upgrade Membership</h1>

                {/* Plan Selector */}
                <div className="mb-6 grid grid-cols-3 gap-2">
                    {Object.keys(upiDetails.tiers).map(tier => (
                        <button
                            key={tier}
                            onClick={() => setSelectedPlan(tier)}
                            className={`p-2 rounded border capitalize ${selectedPlan === tier ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200'}`}
                        >
                            {tier}
                        </button>
                    ))}
                </div>

                {/* Plan Details */}
                <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-100">
                    <h3 className="font-bold text-lg capitalize">{selectedPlan} Plan</h3>
                    <p className="text-gray-600 mb-2">{currentPlan.description}</p>
                    <div className="text-3xl font-bold text-blue-700">₹{currentPlan.amount}</div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center mb-6">
                    <img src={qrUrl} alt="Scan to Pay" className="border p-2 rounded mb-2" />
                    <p className="text-sm text-gray-500">Scan via GPay / PhonePe / Paytm</p>
                    <p className="text-xs text-gray-400 mt-1">{upiDetails.upi_id}</p>
                </div>

                {/* Submission Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Transaction ID (UTR)</label>
                        <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Enter 12-digit UTR"
                            className="w-full p-2 border rounded"
                            required
                            minLength={6}
                        />
                    </div>

                    {status.error && <div className="text-red-500 text-sm">{status.error}</div>}
                    {status.message && <div className="text-green-500 text-sm">{status.message}</div>}

                    <button
                        type="submit"
                        disabled={status.loading}
                        className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition"
                    >
                        {status.loading ? 'Verifying...' : 'Submit Payment'}
                    </button>
                </form>
            </div>

            {/* RIGHT: HISTORY & INFO */}
            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-bold mb-3">How it works</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        {upiDetails.instructions.map((inst, i) => (
                            <li key={i}>{inst}</li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-bold mb-4">Payment History</h3>
                    <div className="space-y-3">
                        {history.length === 0 && <p className="text-gray-400 text-sm">No payments yet.</p>}
                        {history.map(pay => (
                            <div key={pay.id} className="flex justify-between items-center p-3 border-b last:border-0">
                                <div>
                                    <div className="font-medium capitalize">{pay.plan_purchased} Plan</div>
                                    <div className="text-xs text-gray-500">{new Date(pay.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">₹{pay.amount}</div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${pay.status === 'verified' ? 'bg-green-100 text-green-800' :
                                            pay.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {pay.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
