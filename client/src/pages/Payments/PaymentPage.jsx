import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../services/api';
import { Button } from '@/components/ui/button';
import TransactionStepper from '@/components/TransactionStepper';

const PaymentPage = () => {
  const [upiDetails, setUpiDetails] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('silver');
  const [transactionId, setTransactionId] = useState('');
  const [submitStatus, setSubmitStatus] = useState({ loading: false, message: '', error: '' });
  const [history, setHistory] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const loadPaymentDetails = async () => {
    setDetailsLoading(true);
    setDetailsError('');
    try {
      const response = await axios.get('/payments/upi-details');
      setUpiDetails(response.data || null);
    } catch (err) {
      setUpiDetails(null);
      setDetailsError(err.response?.data?.error || 'Failed to load payment details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await axios.get('/payments/status');
      setHistory(Array.isArray(response?.data?.payments) ? response.data.payments : []);
    } catch (err) {
      setHistory([]);
      setHistoryError(err.response?.data?.error || 'Failed to load payment history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentDetails();
    loadHistory();
  }, []);

  const availablePlans = useMemo(() => Object.keys(upiDetails?.tiers || {}), [upiDetails]);
  const paymentFlowSteps = useMemo(() => ([
    { key: 'discover', label: 'Select Plan', hint: 'Choose membership tier' },
    { key: 'pay', label: 'Pay', hint: 'Scan UPI or app link' },
    { key: 'submit', label: 'Submit UTR', hint: 'Provide transaction ID' },
    { key: 'verify', label: 'Verification', hint: 'Team validates payment' },
    { key: 'active', label: 'Membership Active', hint: 'Tier updated on approval' }
  ]), []);

  useEffect(() => {
    if (!availablePlans.length) return;
    if (!availablePlans.includes(selectedPlan)) {
      setSelectedPlan(availablePlans[0]);
    }
  }, [availablePlans, selectedPlan]);

  const currentPlan = upiDetails?.tiers?.[selectedPlan];

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentPlan) {
      setSubmitStatus({ loading: false, message: '', error: 'Please select a valid plan.' });
      return;
    }
    if (!transactionId.trim()) {
      setSubmitStatus({ loading: false, message: '', error: 'Transaction ID is required.' });
      return;
    }

    setSubmitStatus({ loading: true, message: '', error: '' });
    try {
      const response = await axios.post('/payments/submit', {
        plan_type: selectedPlan,
        transaction_id: transactionId.trim(),
        amount: currentPlan.amount,
      });
      setSubmitStatus({
        loading: false,
        message: response?.data?.message || 'Payment submitted successfully.',
        error: '',
      });
      setTransactionId('');
      await loadHistory();
    } catch (err) {
      setSubmitStatus({
        loading: false,
        message: '',
        error: err.response?.data?.error || 'Submission failed.',
      });
    }
  };

  if (detailsLoading) {
    return <div className="p-6 text-center">Loading payment details...</div>;
  }

  if (!upiDetails || detailsError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Unable to load payment details</h2>
          <p className="text-sm text-red-600 mb-4">{detailsError || 'Payment details are unavailable right now.'}</p>
          <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" onClick={loadPaymentDetails}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const upiLink = `upi://pay?pa=${upiDetails.upi_id}&pn=${encodeURIComponent(upiDetails.merchant_name)}&am=${currentPlan?.amount || 0}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 space-y-6">
      <TransactionStepper steps={paymentFlowSteps} currentStep={2} />
      <div className="grid md:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Upgrade Membership</h1>

        <div className="mb-6 grid grid-cols-3 gap-2">
          {availablePlans.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedPlan(tier)}
              className={`p-2 rounded border capitalize ${selectedPlan === tier ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200'}`}
            >
              {tier}
            </button>
          ))}
        </div>

        {currentPlan ? (
          <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-100">
            <h3 className="font-bold text-lg capitalize">{selectedPlan} Plan</h3>
            <p className="text-gray-600 mb-2">{currentPlan.description}</p>
            <div className="text-3xl font-bold text-blue-700">Rs {currentPlan.amount}</div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-700">Selected plan data is unavailable. Please choose another plan.</p>
          </div>
        )}

        <div className="flex flex-col items-center mb-6">
          <img src={qrUrl} alt="Scan to Pay" className="border p-2 rounded mb-2" />
          <p className="text-sm text-gray-500">Scan using GPay, PhonePe, or Paytm</p>
          <p className="text-xs text-gray-400 mt-1">{upiDetails.upi_id}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Transaction ID (UTR)</label>
            <input
              type="text"
              value={transactionId}
              onChange={(event) => setTransactionId(event.target.value)}
              placeholder="Enter UTR"
              className="w-full p-2 border rounded"
              required
              minLength={6}
            />
          </div>

          {submitStatus.error && <div className="text-red-500 text-sm">{submitStatus.error}</div>}
          {submitStatus.message && <div className="text-green-600 text-sm">{submitStatus.message}</div>}

          <button
            type="submit"
            disabled={submitStatus.loading || !currentPlan}
            className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition disabled:opacity-60"
          >
            {submitStatus.loading ? 'Verifying...' : 'Submit Payment'}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold mb-3">How it works</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
            {(upiDetails.instructions || []).map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Payment History</h3>
            <Button type="button" variant="outline" size="sm" onClick={loadHistory}>
              Refresh
            </Button>
          </div>

          {historyLoading ? (
            <p className="text-gray-500 text-sm">Loading history...</p>
          ) : historyError ? (
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600 mb-2">{historyError}</p>
              <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" size="sm" onClick={loadHistory}>
                Retry
              </Button>
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-sm">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center p-3 border-b last:border-0">
                  <div>
                    <div className="font-medium capitalize">{payment.plan_purchased} Plan</div>
                    <div className="text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">Rs {payment.amount}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${payment.status === 'verified'
                      ? 'bg-green-100 text-green-800'
                      : payment.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default PaymentPage;
