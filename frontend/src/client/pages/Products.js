import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import baseURL from '../../axiosConfig';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [searchedProducts, setSearchedProducts] = useState([]);
  const location = useLocation();

  useEffect(() => {
    // Fetch all products from the server
    const filter = {disabled: false };
    const filterString = JSON.stringify(filter);

     axios
     .get(`${baseURL}/api/products?filter=${encodeURIComponent(filterString)}`)
      .then(response => {
        setProducts(response.data);
      })
      .catch(error => {
        console.error('Error fetching products:', error);
      });
  }, []);

  useEffect(() => {
    
    // Perform search or filter based on the search query
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('q');
    
    console.log(searchQuery);
    if (searchQuery) {
      const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchedProducts(filteredProducts);
    } else {
      setSearchedProducts(products);
    }
  }, [location.search, products]);

  return (
    <section className='container pt-5'>
      <div className="title pt-1 pb-4 mb-4 border-bottom">
          <h3>Products</h3>
        </div>
        <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3">
        {searchedProducts.map(product => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default Products;
