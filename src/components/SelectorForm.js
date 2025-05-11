import React from "react";

const SelectorForm = ({ onSubmit }) => {
  return (
    <div className="p-6 rounded border bg-white shadow-md space-y-4">
      <div className="grid grid-cols-5 gap-4">
        <select className="border p-2 rounded w-full"><option>Select CEX</option></select>
        <select className="border p-2 rounded w-full"><option>Select Token</option></select>
        <select className="border p-2 rounded w-full"><option>Select DEX</option></select>
        <select className="border p-2 rounded w-full"><option>Select Token</option></select>
        <select className="border p-2 rounded w-full"><option>Select Mode</option></select>
      </div>
      <div className="flex gap-4 items-center">
        <input type="number" placeholder="Input diff" className="border p-2 rounded flex-1" />
        <button onClick={onSubmit} className="px-4 py-2 bg-blue-500 text-white rounded">GO</button>
      </div>
    </div>
  );
};

export default SelectorForm;
