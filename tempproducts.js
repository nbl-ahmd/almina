import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import baseURL from '../../axiosConfig';
import Productskeleton from '../components/Productskeleton';
import { v4 as uuidv4 } from 'uuid';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searching, setSearching] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('q');

    if (searchQuery) {



      const response = await axios.get(`${baseURL}/api/products/search?q=${encodedSearchInput}`);
      const searchResults = response.data;


      const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchedProducts(filteredProducts);
      setSearching(true); // Set limit to null if there is a search query
    } else {
      setSearchedProducts(products);
     // Set limit to 10 if there is no search query
    }
  }, [location.search, products]);

  const fetchProducts = () => {
    setLoading(true);

    const filter = { disabled: false };
    const filterString = JSON.stringify(filter);

    axios
      .get(
        `${baseURL}/api/products?filter=${encodeURIComponent(
          filterString
        )}&offset=${offset}${searching === false ? `&limit=${limit}` : ''}` // Include the limit query parameter only if limit is not null
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
  };

  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop ===
      document.documentElement.offsetHeight
    ) {
      setOffset((prevOffset) => prevOffset + (limit !== null ? limit : 10)); // Increase the offset by limit if limit is not null, otherwise use a default value of 10
      setFetchingMore(true);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (fetchingMore) {
      fetchProducts();
    }
  }, [offset, fetchingMore]);

  return (
    <section className="container pt-5">
      <div className="title pt-5">Products</div>
      <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3 px-2">
      {searchedProducts.length === 0 && Array.from({ length: 10 }).map((_, index) => (
        <Productskeleton key={index} />
      ))}
        {searchedProducts.map((product) => (
         
            <ProductCard key={uuidv4()}  product={product} />
       
        ))}
      </div>
      {loading && !fetchingMore }
      {fetchingMore && (
        <div className="text-center">
          <i className="fa fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
        </div>
      )}
    </section>
  );
};

export default Products;
