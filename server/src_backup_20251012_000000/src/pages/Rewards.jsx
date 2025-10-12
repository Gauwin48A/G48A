import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Minimal, elegant banner
const RewardsBanner = () => (
  <div className="w-full flex flex-col items-center justify-center py-8 bg-gradient-to-r from-blue-100 to-blue-300 rounded-2xl mb-8 shadow-lg relative overflow-hidden">
    <div className="absolute left-0 top-0 w-full h-full opacity-10 pointer-events-none select-none">
      <svg width="100%" height="100%" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="300" cy="60" rx="300" ry="60" fill="#3b82f6" />
      </svg>
    </div>
    <div className="relative z-10 flex flex-col items-center">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="28" fill="#2563eb" />
        <path d="M28 12L31.4721 23.5279L43 26L31.4721 28.4721L28 40L24.5279 28.4721L13 26L24.5279 23.5279L28 12Z" fill="#fff" />
      </svg>
      <h1 className="text-3xl font-extrabold text-black mt-4 mb-1 drop-shadow">Rewards & Referrals</h1>
      <p className="text-base text-black font-medium">Track your coins, codes, and referral progress</p>
    </div>
  </div>
);

const Rewards = () => {
  const [user] = useState({
    name: 'John Doe',
    id: 'USR12345',
    rank: 'Silver',
    totalCoins: 1250,
    streak: 5,
    referralCode: 'REF12345',
    dailySecretCode: 'DAILYCODE',
    totalReferrals: 7,
    successfulRefs: 7,
    xpCurrent: 340,
    xpRequired: 500,
    level: 8,
  });
  // Simple referral chain: just a list, no levels/colors
  const [referralChain] = useState([
    { id: "REF001", name: "Priya Singh", joinDate: "2024-01-15", coins: 100 },
    { id: "REF002", name: "Amit Kumar", joinDate: "2024-01-18", coins: 100 },
    { id: "REF003", name: "Sneha Patel", joinDate: "2024-01-20", coins: 100 },
    { id: "REF004", name: "Rahul Verma", joinDate: "2024-01-22", coins: 100 },
  ]);
  const progressPercentage = (user.xpCurrent / user.xpRequired) * 100;
  const [tab, setTab] = useState("direct");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 bg-white rounded-2xl shadow-lg">
        <RewardsBanner />
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-8">
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-blue-200">
                  <AvatarFallback className="text-xl bg-blue-500 text-white font-bold">
                    {user.name?.split(' ').map(n => n[0]).join('') || 'JD'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-blue-100 text-blue-800 text-base px-3 py-1">{user.rank}</Badge>
                    <Badge className="bg-blue-50 text-blue-700 text-base px-3 py-1">Level {user.level}</Badge>
                  </div>
                  <div className="text-gray-700 font-medium">User ID: {user.id}</div>
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-700 font-medium">XP Progress</span>
                  <span className="text-gray-700 font-medium">{user.xpCurrent} / {user.xpRequired}</span>
                </div>
                <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${progressPercentage}%` }}></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card className="bg-blue-600 text-white rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Referral Code</h3>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => navigator.clipboard.writeText(user.referralCode)}>
                      <Copy className="w-4 h-4 mr-1" />Copy
                    </Button>
                  </div>
                  <div className="text-3xl font-bold mb-2">{user.referralCode}</div>
                  <p className="text-blue-100 text-sm mb-4">Share and earn coins</p>
                  <div className="text-blue-100 text-sm">{user.totalReferrals} referrals</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-100 text-blue-900 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Daily Secret Code</h3>
                    <Button variant="ghost" size="sm" className="text-blue-900 hover:bg-blue-200" onClick={() => navigator.clipboard.writeText(user.dailySecretCode)}>
                      <Copy className="w-4 h-4 mr-1" />Copy
                    </Button>
                  </div>
                  <div className="text-3xl font-bold mb-2">{user.dailySecretCode}</div>
                  <p className="text-blue-700 text-sm mb-4">Required for sale confirmations</p>
                  <div className="text-blue-700 text-sm">Expires in 12h 30m</div>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="text-center rounded-xl bg-white border border-blue-100">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold text-xl">{user.totalCoins}</span>
                  </div>
                  <div className="text-lg font-bold text-blue-800 mb-1">{user.totalCoins}</div>
                  <div className="text-xs text-blue-600">Total Coins</div>
                </CardContent>
              </Card>
              <Card className="text-center rounded-xl bg-white border border-blue-100">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold text-xl">{user.streak}</span>
                  </div>
                  <div className="text-lg font-bold text-blue-800 mb-1">{user.streak}</div>
                  <div className="text-xs text-blue-600">Day Streak</div>
                </CardContent>
              </Card>
              <Card className="text-center rounded-xl bg-white border border-blue-100">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold text-xl">{user.successfulRefs}</span>
                  </div>
                  <div className="text-lg font-bold text-blue-800 mb-1">{user.successfulRefs}</div>
                  <div className="text-xs text-blue-600">Successful Refs</div>
                </CardContent>
              </Card>
            </div>
            <Tabs defaultValue="direct" value={tab} onValueChange={setTab} className="w-full mb-6">
              <TabsList className="flex gap-2 bg-gray-100 rounded-xl p-1 mb-4">
                <TabsTrigger value="direct" className="px-4 py-2 rounded-lg text-black data-[state=active]:bg-white data-[state=active]:font-bold">Direct Referrals</TabsTrigger>
                <TabsTrigger value="indirect" className="px-4 py-2 rounded-lg text-black data-[state=active]:bg-white data-[state=active]:font-bold">Indirect Referrals</TabsTrigger>
              </TabsList>
              <TabsContent value="direct">
                <Card className="border-0 mb-6 bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl text-black">Direct Referrals</CardTitle>
                    <p className="text-gray-700">All users you directly referred</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-gray-200">
                      {referralChain.map((referral) => (
                        <li key={referral.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-white bg-blue-500">
                                {referral.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-black">{referral.name}</p>
                              <p className="text-xs text-gray-600">Joined {referral.joinDate}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold text-black">+{referral.coins} coins</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="indirect">
                <Card className="border-0 mb-6 bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl text-black">Indirect Referrals</CardTitle>
                    <p className="text-gray-700">Referral tree (all levels)</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col items-center">
                        <Avatar className="h-12 w-12 ring-2 ring-blue-400 mb-2">
                          <AvatarFallback className="text-xl bg-blue-500 text-white font-bold">
                            {user.name?.split(' ').map(n => n[0]).join('') || 'JD'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-bold text-black mb-2">You</div>
                      </div>
                      <div className="w-1 h-6 bg-gray-300"></div>
                      <div className="flex flex-wrap justify-center gap-8">
                        {referralChain.map((referral, idx) => (
                          <div key={referral.id} className="flex flex-col items-center">
                            <Avatar className="h-10 w-10 ring-2 ring-blue-300 mb-1">
                              <AvatarFallback className="text-base bg-blue-400 text-white font-bold">
                                {referral.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-semibold text-black text-sm text-center">{referral.name}</div>
                            <div className="text-xs text-gray-600">+{referral.coins} coins</div>
                            <div className="text-xs text-gray-400">{referral.joinDate}</div>
                            {/* Example: show indirect referrals as children (mocked for demo) */}
                            {idx === 0 && (
                              <div className="flex flex-col items-center mt-2">
                                <div className="w-0.5 h-4 bg-gray-200"></div>
                                <div className="flex gap-4 mt-1">
                                  <div className="flex flex-col items-center">
                                    <Avatar className="h-8 w-8 ring-2 ring-blue-200 mb-1">
                                      <AvatarFallback className="text-xs bg-blue-200 text-blue-700 font-bold">SP</AvatarFallback>
                                    </Avatar>
                                    <div className="text-xs text-black">S. Patel</div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <Avatar className="h-8 w-8 ring-2 ring-blue-200 mb-1">
                                      <AvatarFallback className="text-xs bg-blue-200 text-blue-700 font-bold">RV</AvatarFallback>
                                    </Avatar>
                                    <div className="text-xs text-black">R. Verma</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            {/* ...rest of rewards page... */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rewards;
