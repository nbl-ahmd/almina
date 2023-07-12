import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ProductCard from './ProductCard';

const { v4: uuidv4 } = require('uuid');

const SearchResults = () => {
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const searchResults = location.state?.searchResults || [];
    const searchQuery = location.state?.searchQuery || '';

    setSearchedProducts(searchResults);
    setLoading(false);

    // Perform any additional actions with the search results and query if needed
    console.log('Search query:', searchQuery);
    console.log('Search results:', searchResults);
  }, [location.state]);

  return (
    <section className="container pt-5" style={{ paddingBottom: '100px' }}>
      <div className="title pt-5">Search Results</div>
      {loading ? (
        <div className="text-center" style={{ opacity: 0.5 }}>
          <p>Loading...</p>
        </div>
      ) : (
        <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3 px-2 mb-4">
          {searchedProducts.length === 0 ? (
            <p>No results found.</p>
          ) : (
            searchedProducts.map((product) => (
              <ProductCard key={uuidv4()} product={product} />
            ))
          )}
        </div>
      )}
    </section>
  );
};

export default SearchResults;
