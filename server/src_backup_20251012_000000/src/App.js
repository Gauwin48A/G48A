import React from "react";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import DealsSection from "./components/DealsSection";
import CategoryGrid from "./components/CategoryGrid";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        <HeroSection />
        <DealsSection />
        <CategoryGrid />
      </main>
      <Footer />
    </div>
  );
}

export default App;
