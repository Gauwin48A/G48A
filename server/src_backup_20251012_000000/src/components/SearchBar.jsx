import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center w-full max-w-xl mx-auto py-4">
      <input
        type="text"
        className="flex-1 px-4 py-2 rounded-l border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Search products, brands, categories..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-r font-semibold hover:bg-indigo-700 transition">Search</button>
    </form>
  );
};

export default SearchBar;
