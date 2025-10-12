import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Shield, Clock, Award, Star, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Saledone = () => {
  const { toast } = useToast();
  const [sellerForm, setSellerForm] = useState({
    postId: '',
    buyerId: '',
    buyerSecretCode: '',
    saleAmount: ''
  });
  const [buyerForm, setBuyerForm] = useState({
    postId: '',
    sellerId: '',
    sellerSecretCode: '',
    confirmationCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationType, setConfirmationType] = useState('');

  const [completedSales] = useState([
    {
      id: "SALE001",
      postTitle: "iPhone 14 Pro Max 128GB",
      buyer: "Priya Singh",
      seller: "Rahul Sharma",
      amount: 95000,
      completedDate: "2024-01-20",
      rating: 5,
      feedback: "Great seller, product as described!"
    },
    {
      id: "SALE002", 
      postTitle: "Samsung Galaxy S23 Ultra",
      buyer: "Amit Kumar",
      seller: "Sneha Patel",
      amount: 75000,
      completedDate: "2024-01-18",
      rating: 4,
      feedback: "Good condition, fast delivery"
    }
  ]);

  const handleSellerSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setConfirmationType('seller');
      setShowConfirmation(true);
      toast({
        title: "Sale Confirmation Initiated",
        description: "Buyer will be notified to confirm the sale"
      });
    }, 1500);
  };

  const handleBuyerSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setConfirmationType('buyer');
      setShowConfirmation(true);
      toast({
        title: "Sale Confirmed Successfully",
        description: "Both parties have verified the transaction"
      });
    }, 1500);
  };

  const resetForms = () => {
    setSellerForm({ postId: '', buyerId: '', buyerSecretCode: '', saleAmount: '' });
    setBuyerForm({ postId: '', sellerId: '', sellerSecretCode: '', confirmationCode: '' });
    setShowConfirmation(false);
    setConfirmationType('');
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="max-w-4xl mx-auto p-4">
          <Link to="/my-home" className="inline-flex items-center text-sky-600 hover:text-sky-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Home
          </Link>
          
          <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {confirmationType === 'seller' ? 'Sale Confirmation Sent!' : 'Sale Completed Successfully!'}
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                {confirmationType === 'seller' 
                  ? 'The buyer will receive a notification to confirm the sale. You will be notified once they respond.'
                  : 'Both parties have successfully verified the transaction. Congratulations on your sale!'
                }
              </p>
              
              {confirmationType === 'buyer' && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
                  <div className="flex items-center justify-center space-x-4 text-green-800">
                    <Award className="w-6 h-6" />
                    <span className="font-semibold">You've earned 50 reward points!</span>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={resetForms}
                  variant="outline"
                  className="border-sky-500 text-sky-600 hover:bg-sky-50"
                >
                  Mark Another Sale
                </Button>
                <Button 
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 main-content">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/my-home" className="inline-flex items-center text-sky-600 hover:text-sky-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Home
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent mb-2">
            Sale Confirmation
          </h1>
          <p className="text-gray-600 text-lg">Complete the dual verification process to confirm your sale</p>
        </div>

        <div className="space-y-8">
          {/* Dual Verification Forms */}
          <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-6 h-6" />
                <span>Dual Verification Process</span>
              </CardTitle>
              <CardDescription className="text-green-100">
                Both buyer and seller must verify using secret codes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <Tabs defaultValue="seller" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 rounded-xl p-1">
                  <TabsTrigger value="seller" className="rounded-lg">I'm the Seller</TabsTrigger>
                  <TabsTrigger value="buyer" className="rounded-lg">I'm the Buyer</TabsTrigger>
                </TabsList>
                
                <TabsContent value="seller">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-2">For Sellers:</p>
                        <ul className="space-y-1 text-blue-700">
                          <li>• Enter your Post ID and Buyer's User ID</li>
                          <li>• Ask buyer for their daily secret code</li>
                          <li>• Buyer will receive notification to confirm</li>
                          <li>• Both parties must verify within 24 hours</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSellerSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="postId" className="text-sm font-semibold text-gray-700">Post ID</Label>
                      <Input
                        id="postId"
                        value={sellerForm.postId}
                        onChange={(e) => setSellerForm(prev => ({ ...prev, postId: e.target.value }))}
                        placeholder="e.g., POST123456"
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500 rounded-xl"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="buyerId" className="text-sm font-semibold text-gray-700">Buyer's User ID</Label>
                      <Input
                        id="buyerId"
                        value={sellerForm.buyerId}
                        onChange={(e) => setSellerForm(prev => ({ ...prev, buyerId: e.target.value }))}
                        placeholder="e.g., USER789012"
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500 rounded-xl"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="buyerSecretCode" className="text-sm font-semibold text-gray-700">Buyer's Secret Code</Label>
                      <Input
                        id="buyerSecretCode"
                        value={sellerForm.buyerSecretCode}
                        onChange={(e) => setSellerForm(prev => ({ ...prev, buyerSecretCode: e.target.value.toUpperCase() }))}
                        placeholder="e.g., ABC123"
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500 rounded-xl font-mono text-center"
                        maxLength={6}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="saleAmount" className="text-sm font-semibold text-gray-700">Sale Amount (₹)</Label>
                      <Input
                        id="saleAmount"
                        type="number"
                        value={sellerForm.saleAmount}
                        onChange={(e) => setSellerForm(prev => ({ ...prev, saleAmount: e.target.value }))}
                        placeholder="Enter final sale amount"
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500 rounded-xl"
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl text-lg font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? "Processing..." : "Initiate Sale Confirmation"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="buyer">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div className="text-sm text-purple-800">
                        <p className="font-semibold mb-2">For Buyers:</p>
                        <ul className="space-y-1 text-purple-700">
                          <li>• Enter Post ID and Seller's User ID</li>
                          <li>• Ask seller for their daily secret code</li>
                          <li>• Confirm the sale to complete transaction</li>
                          <li>• Both parties will receive confirmation</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleBuyerSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="buyerPostId" className="text-sm font-semibold text-gray-700">Post ID</Label>
                      <Input
                        id="buyerPostId"
                        value={buyerForm.postId}
                        onChange={(e) => setBuyerForm(prev => ({ ...prev, postId: e.target.value }))}
                        placeholder="e.g., POST123456"
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500 rounded-xl"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="sellerId" className="text-sm font-semibold text-gray-700">Seller's User ID</Label>
                      <Input
                        id="sellerId"
                        value={buyerForm.sellerId}
                        onChange={(e) => setBuyerForm(prev => ({ ...prev, sellerId: e.target.value }))}
                        placeholder="e.g., USER345678"
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500 rounded-xl"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="sellerSecretCode" className="text-sm font-semibold text-gray-700">Seller's Secret Code</Label>
                      <Input
                        id="sellerSecretCode"
                        value={buyerForm.sellerSecretCode}
                        onChange={(e) => setBuyerForm(prev => ({ ...prev, sellerSecretCode: e.target.value.toUpperCase() }))}
                        placeholder="e.g., XYZ789"
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500 rounded-xl font-mono text-center"
                        maxLength={6}
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl text-lg font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? "Confirming..." : "Confirm Sale"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Completed Sales History */}
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Completed Sales</h2>
            {completedSales.length === 0 ? (
              <div className="text-gray-500">No completed sales yet.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {completedSales.map((sale, idx) => (
                  <div key={sale.id || idx} className="bg-white rounded-2xl shadow border border-gray-100 p-4 flex flex-col gap-2">
                    <div className="flex flex-row justify-between items-center">
                      <div>
                        <h3 className="font-bold text-base text-gray-900 mb-0.5">{sale.postTitle}</h3>
                        <p className="text-gray-500 text-xs mb-1">Buyer: {sale.buyer} | Seller: {sale.seller}</p>
                      </div>
                      <span className="text-green-600 font-bold text-lg">₹{sale.amount}</span>
                    </div>
                    <div className="flex flex-row justify-between items-center">
                      <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5">Completed: {sale.completedDate}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">Rating: {sale.rating}</span>
                    </div>
                    <div className="text-gray-600 text-sm mt-1">{sale.feedback}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-6 h-6" />
              <span>How Sale Confirmation Works</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold text-gray-900">Initiate</h3>
                <p className="text-sm text-gray-600">Seller starts the process with buyer's secret code and sale details</p>
              </div>
              <div className="space-y-3">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-purple-600">2</span>
                </div>
                <h3 className="font-semibold text-gray-900">Verify</h3>
                <p className="text-sm text-gray-600">Buyer confirms using seller's secret code to verify the transaction</p>
              </div>
              <div className="space-y-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <h3 className="font-semibold text-gray-900">Complete</h3>
                <p className="text-sm text-gray-600">Both parties receive confirmation and earn reward points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Saledone;