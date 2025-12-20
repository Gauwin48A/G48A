import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Phone, MapPin, MessageCircle, Send, User, CheckCircle } from 'lucide-react';

export default function BuyerInterestModal({ isOpen, onClose, postId, postTitle }) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        buyerName: '',
        phone: '',
        address: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Basic validation
        if (!formData.buyerName.trim()) {
            setError(t('name_required') || 'Please enter your name');
            setLoading(false);
            return;
        }

        if (!formData.phone.trim() || formData.phone.length < 10) {
            setError(t('phone_required') || 'Please enter a valid phone number');
            setLoading(false);
            return;
        }

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const token = localStorage.getItem('token');

            const response = await fetch(`${baseUrl}/api/inquiries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                    postId,
                    buyerName: formData.buyerName.trim(),
                    phone: formData.phone.trim(),
                    address: formData.address.trim() || null,
                    message: formData.message.trim() || null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit');
            }

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData({ buyerName: '', phone: '', address: '', message: '' });
            }, 2500);

        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
            setError('');
            setSuccess(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-0 shadow-2xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">📞</span>
                        {t('interested_in_buying') || "I'm Interested!"}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        {postTitle && (
                            <span className="font-medium text-blue-600 dark:text-blue-400">"{postTitle}"</span>
                        )}
                        <br />
                        {t('interest_description') || 'Share your contact details with the seller. They will reach out to you.'}
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="py-8 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                            {t('success') || 'Submitted Successfully!'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {t('seller_will_contact') || 'The seller will contact you soon.'}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Name Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <User className="w-4 h-4" />
                                {t('your_name') || 'Your Name'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="buyerName"
                                value={formData.buyerName}
                                onChange={handleChange}
                                placeholder={t('enter_name') || 'Enter your full name'}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                required
                            />
                        </div>

                        {/* Phone Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Phone className="w-4 h-4" />
                                {t('phone_number') || 'Phone Number'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder={t('enter_phone') || '+91 98765 43210'}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                required
                            />
                        </div>

                        {/* Address Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <MapPin className="w-4 h-4" />
                                {t('address') || 'Your Address'} <span className="text-gray-400">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder={t('enter_address') || 'City, Area, Landmark'}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            />
                        </div>

                        {/* Message Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <MessageCircle className="w-4 h-4" />
                                {t('message') || 'Message / Questions'} <span className="text-gray-400">(Optional)</span>
                            </label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder={t('enter_message') || 'Any questions for the seller? E.g., Is price negotiable?'}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                            />
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {t('submitting') || 'Submitting...'}
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    {t('send_to_seller') || 'Send to Seller'}
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                            🔒 {t('privacy_note') || 'Your details will only be shared with this seller.'}
                        </p>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
