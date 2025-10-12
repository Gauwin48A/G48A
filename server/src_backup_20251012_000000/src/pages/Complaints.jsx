import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileText, Clock, CheckCircle } from "lucide-react";

const Complaints = () => {
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
    fetch('http://localhost:5000/api/complaints')
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
        title: "Incomplete Form",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Submit complaint logic here
    console.log('Complaint submitted:', complaintForm);
    
    toast({
      title: "Complaint Submitted",
      description: "Your complaint has been submitted and will be reviewed by our team."
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
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="bg-white min-h-screen flex flex-col items-center">
      <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={()=>window.location.href='/'}>Back</button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complaints & Support</h1>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
          {/* Submit Complaint Form */}
          <Card className="bg-white shadow-lg border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-800 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                Submit New Complaint
              </CardTitle>
              <CardDescription>
                Only for completed sales with sale confirmation codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sellerId">Seller ID *</Label>
                    <Input
                      id="sellerId"
                      name="sellerId"
                      value={complaintForm.sellerId}
                      onChange={handleInputChange}
                      placeholder="USER123456"
                      className="border-blue-200 focus:border-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyerId">Buyer ID *</Label>
                    <Input
                      id="buyerId"
                      name="buyerId"
                      value={complaintForm.buyerId}
                      onChange={handleInputChange}
                      placeholder="USER654321"
                      className="border-blue-200 focus:border-blue-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postId">Post ID *</Label>
                    <Input
                      id="postId"
                      name="postId"
                      value={complaintForm.postId}
                      onChange={handleInputChange}
                      placeholder="POST001"
                      className="border-blue-200 focus:border-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="secretCode">Sale Confirmation Code *</Label>
                    <Input
                      id="secretCode"
                      name="secretCode"
                      value={complaintForm.secretCode}
                      onChange={handleInputChange}
                      placeholder="ABC123"
                      className="border-blue-200 focus:border-blue-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="complaintType">Complaint Type</Label>
                  <select
                    id="complaintType"
                    name="complaintType"
                    value={complaintForm.complaintType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:border-blue-400 focus:ring-blue-200"
                  >
                    <option value="transaction">Transaction Issue</option>
                    <option value="quality">Product Quality</option>
                    <option value="communication">Communication Problem</option>
                    <option value="fraud">Suspected Fraud</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={complaintForm.description}
                    onChange={handleInputChange}
                    placeholder="Please describe your complaint in detail..."
                    rows={4}
                    className="border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  Submit Complaint
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Complaints */}
          <Card className="bg-white shadow-lg border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                My Complaints
              </CardTitle>
              <CardDescription>
                Track the status of your submitted complaints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayedComplaints.map((complaint) => (
                  <Card key={complaint.complaint_id || complaint.id || complaint._id} className="border border-gray-200 rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">{complaint.type}</h4>
                          <p className="text-sm text-gray-600">ID: {complaint.complaint_id || complaint.id || complaint._id}</p>
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
                          <span className="font-medium text-gray-600">Post ID:</span>
                          <span className="ml-2">{complaint.postId}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Submitted:</span>
                          <span className="ml-2">{complaint.submittedDate}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-700">{complaint.description}</p>
                      </div>

                      {complaint.adminResponse && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-green-800 mb-1">Admin Response:</p>
                          <p className="text-sm text-green-700">{complaint.adminResponse}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {displayedComplaints.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No complaints submitted yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Important Notice */}
        <Card className="mt-8 bg-yellow-50 border-yellow-200 shadow-lg border rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">Important Guidelines</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Complaints can only be filed for completed transactions with valid sale confirmation codes</li>
                  <li>• Provide accurate Seller ID, Buyer ID, and Post ID for faster resolution</li>
                  <li>• False complaints may result in account restrictions</li>
                  <li>• Response time: 24-48 hours for most complaints</li>
                  <li>• Contact support@mobilemart.com for urgent issues</li>
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
