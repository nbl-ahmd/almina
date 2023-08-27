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
  const [searchQuery, setSearchQuery] = useState('');
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
    const newSearchQuery = searchParams.get('q');
    setSearchQuery(newSearchQuery || '');
    setOffset(0); // Reset offset when search query changes
  }, [location.search]);

  useEffect(() => {
    if (searchQuery) {
      search();
      setSearching(true);
    } else {
      setSearchedProducts([]);
      setSearching(false);
    }
  }, [searchQuery]);




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
      setLoaded(true);
      setLoading(false);
      setFetchingMore(false); // Reset fetchingMore state
    } else {
      setFetchingMore(true);
    }
  };

  const fetchProducts = async () => {
    console.log('fetch products called')
    setLoaded(false); // Reset loaded state before fetching more products
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
    <div className='overflow-y-auto' style={{ height: '90vh' }}>
      <InfiniteScroll
        dataLength={searching ? searchedProducts.length : productList.length}
        next={searching ? search : fetchProducts}
        hasMore={searching ? !loaded && fetchingMore : true} // Use both loaded and fetchingMore conditions
        loader={<p className='pb-3 text-center'>Loading...</p>}
        endMessage={<p className='pb-3'>No more data to load.</p>}
        scrollThreshold={0.8}
        height={'90vh'}
      
      >
        <div className="container mb-5">
          <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-5 mt-3 px-2 mb-4">
            {searching
              ? searchedProducts.map(product => (
                  <ProductCard_admin key={product.id} product={product} />
                ))
              :
              
                productList.map(product => (
                  <ProductCard_admin key={product.id} product={product} />
                ))}
          </div>
        </div>
      </InfiniteScroll>
    </div>
  );
};

export default Products_list;