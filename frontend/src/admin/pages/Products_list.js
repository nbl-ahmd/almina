import axios from 'axios';
import React, { useEffect, useState } from 'react'
import ProductCard_admin from '../components/ProductCard_admin';
import baseURL from '../../axiosConfig';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useLocation } from 'react-router-dom';

const Products_list = () => {
  const [productList, setProductList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searching, setSearching] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${baseURL}/api/products`, {
        params: {
          disabled: false,
          offset: offset,
          limit: searching === false ? limit : undefined
        }
      });
      const data = response.data;

      setProductList(prevItems => [...prevItems, ...data]);
      setOffset(prevOffset => prevOffset + limit);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <InfiniteScroll
        dataLength={searching ? searchedProducts.length : productList.length}
        next={fetchProducts}
        hasMore={searching ? !loaded : true} // Update hasMore condition
        loader={<p className='pb-3 text-center'>Loading...</p>}
        endMessage={<p className='pb-3'>No more data to load.</p>}
      >
        <div className="container mb-5">
          <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-5 mt-3 px-2 mb-4">
            {searching
              ? searchedProducts.map(product => (
                  <ProductCard_admin key={product.id} product={product} />
                ))
              : productList.map(product => (
                  <ProductCard_admin key={product.id} product={product} />
                ))}
          </div>
        </div>
      </InfiniteScroll>
    </div>
  );
};

export default Products_list;