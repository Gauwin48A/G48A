import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Star, Send, Heart } from "lucide-react";

const Feedback = () => {
  const { toast } = useToast();
  const [feedbackForm, setFeedbackForm] = useState({
    userId: 'USER123456', // This would come from auth context
    name: 'Rahul Sharma', // This would come from auth context
    email: 'rahul.sharma@example.com', // This would come from auth context
    feedbackType: 'general',
    rating: 5,
    subject: '',
    message: ''
  });
  const [feedbacks, setFeedbacks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/feedback')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFeedbacks(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch feedback');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch feedback');
        setLoading(false);
      });
  }, []);

  // Fix: Add fallback UI if feedback fetch fails
  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (rating) => {
    setFeedbackForm(prev => ({
      ...prev,
      rating: rating
    }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    if (!feedbackForm.subject || !feedbackForm.message) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in both subject and message fields",
        variant: "destructive"
      });
      return;
    }

    // Submit feedback logic here
    console.log('Feedback submitted:', feedbackForm);
    
    toast({
      title: "Feedback Submitted!",
      description: "Thank you for your valuable feedback. We appreciate your input!"
    });

    // Reset form
    setFeedbackForm(prev => ({
      ...prev,
      feedbackType: 'general',
      rating: 5,
      subject: '',
      message: ''
    }));
  };

  const renderStars = () => {
    return [...Array(5)].map((_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => handleRatingChange(index + 1)}
        className={`text-2xl transition-colors ${
          index < feedbackForm.rating ? 'text-yellow-400' : 'text-gray-300'
        } hover:text-yellow-400`}
      >
        <Star className="w-6 h-6 fill-current" />
      </button>
    ));
  };

  return (
    <div className="bg-white min-h-screen flex flex-col items-center">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center flex items-center justify-center gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={()=>window.location.href='/'}>Back</button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">We Value Your Feedback</h1>
        </div>
        <p className="text-gray-600 text-center">Help us improve MobileHub with your suggestions and experiences</p>

        <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
          {/* Feedback Form */}
          <Card className="bg-white shadow-lg border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-800 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
                Share Your Feedback
              </CardTitle>
              <CardDescription>
                Your opinion matters to us. Let us know how we can improve!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                {/* User Info (Read-only) */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div><span className="font-medium">User ID:</span> {feedbackForm.userId}</div>
                    <div><span className="font-medium">Name:</span> {feedbackForm.name}</div>
                    <div><span className="font-medium">Email:</span> {feedbackForm.email}</div>
                  </div>
                </div>

                {/* Feedback Type */}
                <div>
                  <Label htmlFor="feedbackType">Feedback Category</Label>
                  <select
                    id="feedbackType"
                    name="feedbackType"
                    value={feedbackForm.feedbackType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:border-blue-400 focus:ring-blue-200 mt-1"
                  >
                    <option value="general">General Feedback</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug Report</option>
                    <option value="ui">UI/UX Improvement</option>
                    <option value="performance">Performance Issue</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                </div>

                {/* Rating */}
                <div>
                  <Label>Overall Rating</Label>
                  <div className="flex items-center space-x-1 mt-2">
                    {renderStars()}
                    <span className="ml-3 text-sm text-gray-600">
                      ({feedbackForm.rating} out of 5 stars)
                    </span>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    value={feedbackForm.subject}
                    onChange={handleInputChange}
                    placeholder="Brief summary of your feedback"
                    className="border-blue-200 focus:border-blue-400 mt-1"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message">Your Feedback *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={feedbackForm.message}
                    onChange={handleInputChange}
                    placeholder="Please share your detailed feedback, suggestions, or report any issues you've encountered..."
                    rows={6}
                    className="border-blue-200 focus:border-blue-400 mt-1"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Feedback Guidelines & Info */}
          <div className="space-y-6">
            {/* Why Feedback Matters */}
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg border-0 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Heart className="w-8 h-8 mr-3" />
                  <h3 className="text-xl font-semibold">Why Your Feedback Matters</h3>
                </div>
                <ul className="space-y-2 text-blue-100">
                  <li>• Helps us understand your needs better</li>
                  <li>• Guides our product development priorities</li>
                  <li>• Improves the experience for all users</li>
                  <li>• Makes MobileHub more secure and reliable</li>
                </ul>
              </CardContent>
            </Card>

            {/* Feedback Categories */}
            <Card className="bg-white shadow-lg border-0 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-gray-800">Feedback Categories</CardTitle>
                <CardDescription>Choose the most relevant category for your feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800">🐛 Bug Report</h4>
                    <p className="text-sm text-gray-600">Report technical issues or errors</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800">💡 Feature Request</h4>
                    <p className="text-sm text-gray-600">Suggest new features or improvements</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800">🎨 UI/UX Improvement</h4>
                    <p className="text-sm text-gray-600">Suggest design or usability improvements</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800">⚡ Performance Issue</h4>
                    <p className="text-sm text-gray-600">Report slow loading or performance problems</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800">💭 General Feedback</h4>
                    <p className="text-sm text-gray-600">Share general thoughts and experiences</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-green-50 border-green-200 shadow-lg border rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-semibold text-green-800 mb-3">Direct Contact</h3>
                <div className="space-y-2 text-sm text-green-700">
                  <p><span className="font-medium">Email:</span> feedback@mobilemart.com</p>
                  <p><span className="font-medium">Response Time:</span> 24-48 hours</p>
                  <p><span className="font-medium">Priority Support:</span> Verified users get faster responses</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Thank You Message */}
        <Card className="mt-8 bg-purple-50 border-purple-200 shadow-lg border rounded-2xl">
          <CardContent className="p-6 text-center">
            <Heart className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-purple-800 mb-2">Thank You for Being Part of Our Community!</h3>
            <p className="text-purple-700">
              Your feedback helps us build a better, safer, and more user-friendly platform for everyone.
              Together, we're creating India's most trusted mobile marketplace.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
