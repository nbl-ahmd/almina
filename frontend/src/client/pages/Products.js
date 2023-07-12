import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import baseURL from '../../axiosConfig';
import Productskeleton from '../components/Productskeleton';
import { v4 as uuidv4 } from 'uuid';
import BackToTopButton from '../components/BackToTopButton';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searching, setSearching] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [loaded, setLoaded] = useState(false); // Move loaded state here
  const location = useLocation();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      search();
      setSearching(true);
    } else {
      setSearchedProducts(products);
      setSearching(false);
    }
  }, [location.search, products]);

  const search = async () => {
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('q');
    const response = await axios.get(
      `${baseURL}/api/products/search?q=${searchQuery}&offset=${offset}${
        searching === false ? `&limit=${limit}` : ''
      }`
    );
    const searchResults = response.data;
    console.log(searchResults.length);
    setSearchedProducts(searchResults);
    console.log(limit);
    if (searchResults.length < limit) {
      setLoaded(true); // Update loaded state
      setLoading(false);
    } else {
      setFetchingMore(true);
    }
  };

  const fetchProducts = () => {
    setLoading(true);

    const filter = { disabled: false };
    const filterString = JSON.stringify(filter);

    axios
      .get(
        `${baseURL}/api/products?filter=${encodeURIComponent(
          filterString
        )}&offset=${offset}${searching === false ? `&limit=${limit}` : ''}`
      )
      .then((response) => {
        setProducts((prevProducts) => [...prevProducts, ...response.data]);
        setLoading(false);
        setFetchingMore(false);
      })
      .catch((error) => {
        console.error('Error fetching products:', error);
        setLoading(false);
        setFetchingMore(false);
      });
    // Delay of 500 milliseconds (adjust as needed)
  };

  const handleScroll = () => {
    const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 5 && !fetchingMore && !loaded) {
      setOffset((prevOffset) => prevOffset + limit);
      setFetchingMore(true);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [fetchingMore, loaded]); // Update the dependency array

  useEffect(() => {
    if (fetchingMore) {
      fetchProducts();
    }
  }, [offset, fetchingMore]);

  return (
    <section className="container pt-5" style={{ paddingBottom: '100px' }}>
      <div className="title pt-5">Products</div>
      <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3 px-2 mb-4">
        {searchedProducts.length === 0 &&
          Array.from({ length: 10 }).map((_, index) => (
            <Productskeleton key={index} />
          ))}
        {searchedProducts.map((product) => (
          <ProductCard key={uuidv4()} product={product} />
        ))}
      </div>
      {(loading || fetchingMore) && (
        <div className="text-center" style={{ opacity: 0.5 }}>
          <i className="fa fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
          <p>Loading...</p>
        </div>
      )}

      {/* Add the BackToTopButton component */}
      <BackToTopButton />
    </section>
  );
};

export default Products;
