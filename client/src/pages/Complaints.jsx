import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileText, Clock, CheckCircle } from "lucide-react";

const Complaints = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [complaintForm, setComplaintForm] = useState({
    sellerId: '',
    buyerId: '',
    postId: '',
    secretCode: '',
    complaintType: 'transaction',
    description: ''
  });

  const [myComplaints] = useState([
    {
      id: 'COMP001',
      type: 'Transaction Issue',
      postId: 'POST001',
      sellerId: 'USER123',
      buyerId: 'USER456',
      status: 'Under Review',
      submittedDate: '2024-01-20',
      description: 'Seller not responding after payment',
      adminResponse: null
    },
    {
      id: 'COMP002',
      type: 'Product Quality',
      postId: 'POST002',
      sellerId: 'USER789',
      buyerId: 'USER456',
      status: 'Resolved',
      submittedDate: '2024-01-15',
      description: 'Phone condition was not as described',
      adminResponse: 'Issue resolved. Refund processed.'
    }
  ]);

  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    fetch(`${baseUrl}/api/complaints`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setComplaints(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch complaints');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch complaints');
        setLoading(false);
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setComplaintForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();

    // Validation
    if (!complaintForm.sellerId || !complaintForm.buyerId || !complaintForm.postId || !complaintForm.secretCode) {
      toast({
        title: t('incomplete_form'),
        description: t('fill_required_fields'),
        variant: "destructive"
      });
      return;
    }

    // Submit complaint logic here
    console.log('Complaint submitted:', complaintForm);

    toast({
      title: t('complaint_submitted'),
      description: t('complaint_submitted_desc')
    });

    // Reset form
    setComplaintForm({
      sellerId: '',
      buyerId: '',
      postId: '',
      secretCode: '',
      complaintType: 'transaction',
      description: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'Resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Under Review':
        return <Clock className="w-4 h-4" />;
      case 'Resolved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const displayedComplaints = complaints.length > 0 ? complaints : myComplaints;

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center transition-colors duration-300">
      <div className="flex flex-col gap-4 w-full max-w-lg mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => window.location.href = '/'}>{t('back')}</button>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('complaints_support')}</h1>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
          {/* Submit Complaint Form */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-800 dark:text-white flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                {t('submit_new_complaint')}
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                {t('complaint_guideline_short')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sellerId" className="dark:text-gray-200">{t('seller_id')} *</Label>
                    <Input
                      id="sellerId"
                      name="sellerId"
                      value={complaintForm.sellerId}
                      onChange={handleInputChange}
                      placeholder="USER123456"
                      className="border-blue-200 focus:border-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyerId" className="dark:text-gray-200">{t('buyer_id')} *</Label>
                    <Input
                      id="buyerId"
                      name="buyerId"
                      value={complaintForm.buyerId}
                      onChange={handleInputChange}
                      placeholder="USER654321"
                      className="border-blue-200 focus:border-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postId" className="dark:text-gray-200">{t('post_id')} *</Label>
                    <Input
                      id="postId"
                      name="postId"
                      value={complaintForm.postId}
                      onChange={handleInputChange}
                      placeholder="POST001"
                      className="border-blue-200 focus:border-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="secretCode" className="dark:text-gray-200">{t('sale_confirmation_code')} *</Label>
                    <Input
                      id="secretCode"
                      name="secretCode"
                      value={complaintForm.secretCode}
                      onChange={handleInputChange}
                      placeholder="ABC123"
                      className="border-blue-200 focus:border-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="complaintType" className="dark:text-gray-200">{t('complaint_type')}</Label>
                  <select
                    id="complaintType"
                    name="complaintType"
                    value={complaintForm.complaintType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 dark:border-gray-600 rounded-lg focus:border-blue-400 focus:ring-blue-200 bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="transaction">{t('transaction_issue')}</option>
                    <option value="quality">{t('product_quality')}</option>
                    <option value="communication">{t('communication_problem')}</option>
                    <option value="fraud">{t('suspected_fraud')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="description" className="dark:text-gray-200">{t('description')} *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={complaintForm.description}
                    onChange={handleInputChange}
                    placeholder={t('complaint_desc_placeholder')}
                    rows={4}
                    className="border-blue-200 focus:border-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  {t('submit_complaint')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Complaints */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-800 dark:text-white flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                {t('my_complaints')}
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                {t('track_complaints')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayedComplaints.map((complaint) => (
                  <Card key={complaint.complaint_id || complaint.id || complaint._id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-800 dark:text-white">{complaint.type}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">ID: {complaint.complaint_id || complaint.id || complaint._id}</p>
                        </div>
                        <Badge className={getStatusColor(complaint.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(complaint.status)}
                            <span>{complaint.status}</span>
                          </div>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-300">{t('post_id')}:</span>
                          <span className="ml-2 dark:text-gray-200">{complaint.postId}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-300">{t('submitted')}:</span>
                          <span className="ml-2 dark:text-gray-200">{complaint.submittedDate}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-700 dark:text-gray-200">{complaint.description}</p>
                      </div>

                      {complaint.adminResponse && (
                        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <p className="text-sm font-medium text-green-800 dark:text-green-100 mb-1">{t('admin_response')}:</p>
                          <p className="text-sm text-green-700 dark:text-green-200">{complaint.adminResponse}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {displayedComplaints.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">{t('no_complaints_yet')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Important Notice */}
        <Card className="mt-8 bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800 shadow-lg border rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-100 mb-2">{t('important_guidelines')}</h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
                  <li>• {t('complaint_rule_1')}</li>
                  <li>• {t('complaint_rule_2')}</li>
                  <li>• {t('complaint_rule_3')}</li>
                  <li>• {t('complaint_rule_4')}</li>
                  <li>• {t('complaint_rule_5')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Complaints;
