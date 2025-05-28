import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import MainApp from "./MainApp";
import VoiceChat from "./VoiceChat";

function App() {
  return (
    <div>
      <nav className="p-4 bg-gray-100 flex space-x-4">
        <Link to="/" className="text-blue-600 hover:underline">Home</Link>
        <Link to="/voice" className="text-blue-600 hover:underline">VoiceChat</Link>
      </nav>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/voice" element={<VoiceChat />} />
      </Routes>
    </div>
  );
}

export default App;
