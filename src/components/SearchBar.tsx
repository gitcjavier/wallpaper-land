import React, { useState, useRef, useEffect } from 'react';

interface SearchBarProps {
  searchQuery?: string;
  suggestions?: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery = '', suggestions = [] }) => {
  const [inputValue, setInputValue] = useState(searchQuery);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (inputValue.trim() === '') {
      setFiltered([]);
      setShowSuggestions(false);
    } else {
      const f = suggestions.filter(title => title.toLowerCase().includes(inputValue.toLowerCase()));
      setFiltered(f);
      setShowSuggestions(f.length > 0);
      setSelectedIndex(-1);
    }
  }, [inputValue, suggestions]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(idx => Math.min(idx + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(idx => Math.max(idx - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (showSuggestions && selectedIndex >= 0 && filtered[selectedIndex]) {
        selectSuggestion(filtered[selectedIndex]);
      } else {
        doSearch(inputValue);
      }
      setShowSuggestions(false);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (title: string) => {
    setInputValue(title);
    setShowSuggestions(false);
    doSearch(title);
  };

  const doSearch = (query: string) => {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('search', query);
    } else {
      url.searchParams.delete('search');
    }
    window.location.href = url.toString();
  };

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="search-bar mb-6">
      <div className="relative max-w-xs mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-4 py-2 rounded-lg leading-5 bg-white/70 border border-purple-400 placeholder-purple-400 text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-md shadow-md"
          placeholder="Buscar wallpapers..."
          value={inputValue}
          ref={inputRef}
          autoComplete="off"
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(filtered.length > 0)}
        />
        {showSuggestions && (
          <ul
            ref={listRef}
            className="absolute left-0 right-0 mt-1 bg-white/90 border border-purple-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto"
          >
            {filtered.map((title, idx) => (
              <li
                key={title}
                className={`px-4 py-2 cursor-pointer hover:bg-purple-100 text-purple-800 ${idx === selectedIndex ? 'bg-purple-200' : ''}`}
                onMouseDown={() => selectSuggestion(title)}
              >
                {title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchBar; 