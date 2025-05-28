import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import MainApp from "./MainApp";
import VoiceChat from "./VoiceChat";

function App() {
  return (
    <div className="min-h-screen bg-pink-50">
      <nav className="flex justify-center pt-5">
        <div className="bg-pink-100 px-6 py-2 rounded-full shadow-md flex space-x-6">
          <Link
            to="/"
            className="text-md font-medium text-black-600 hover:text-blue-800 transition-colors duration-200"
          >
            Home
          </Link>
          <Link
            to="/voice"
            className="text-md font-medium text-black-600 hover:text-blue-800 transition-colors duration-200"
          >
            Voice
          </Link>
        </div>
      </nav>

      <div className="p-4">
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/voice" element={<VoiceChat />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
