import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Search, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SaleUndone = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    fetch(`${baseUrl}/api/transactions/undone`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSales(Array.isArray(data) ? data : []);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch undone sales');
        setLoading(false);
      });
  }, []);

  const filteredSales = sales.filter(sale =>
    (sale.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.postId || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/my-home" className="flex items-center text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Home
          </Link>
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl flex items-center justify-center shadow-lg">
              <RotateCcw className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Unsold Posts</h1>
              <p className="text-gray-600 text-lg">Manage your expired or unsold listings</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by title, Post ID, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
              />
            </div>
          </div>
        </div>
        {loading ? <div>Loading...</div> : filteredSales.map((sale, idx) => (
          <div key={sale.id || idx} className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-4 flex flex-col gap-2">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{sale.title}</h4>
                <p className="text-sm text-gray-600">Brand: {sale.brand}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-orange-600">Post ID: {sale.postId}</div>
                <div className="text-xs text-gray-500">Status: {sale.status}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Reason: {sale.reason || (
                <input type='text' placeholder='Enter reason' className='border rounded px-2 py-1 text-sm' onBlur={e => {/* TODO: Save reason to DB */}} />
              )}</span>
              <Badge className="bg-orange-500 text-white">Unsold</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SaleUndone;
