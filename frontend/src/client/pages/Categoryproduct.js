import React, { useEffect, useState } from 'react';
import axios from 'axios';
import baseURL from '../../axiosConfig';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const [products, setProducts] = useState([]);
  const [catname, setCatname] = useState('');

  useEffect(() => {
    axios.get(`${baseURL}/api/category/${categoryId}`).then((response) => {
        console.log(response.data.name);
        setCatname(response.data.name);
      })
   

    fetchProductsByCategory(categoryId);
  }, [categoryId]);

  const fetchProductsByCategory = async (categoryId) => {
    try {
      const filter = {"category": categoryId, "disabled": false };
    const filterString = JSON.stringify(filter);
        const response = await axios.get(`${baseURL}/api/products?filter=${encodeURIComponent(filterString)}`);
        setProducts(response.data);
        console.log(response.data);
        console.log(filter);
     
    } catch (error) {
      console.error('Error fetching products by category:', error);
    }
  };
  // const fetchProductsByCategory = async (categoryId) => {
  //   try {
  //     const filter = {disabled: false };
  //   const filterString = JSON.stringify(filter);
  //       const response = await axios.get(`${baseURL}/api/products/category/${categoryId}?filter=${encodeURIComponent(filterString)}`);
  //       setProducts(response.data);
  //       console.log(response.data)
  //     setProducts(response.data);
  //   } catch (error) {
  //     console.error('Error fetching products by category:', error);
  //   }
  // };

  return (

    <section className='container pt-5 h-100'>
    <div className="title pt-1 pb-4 mb-4 border-bottom">
        <h3>{catname}</h3>
      </div>
      <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3">
      {products.length > 0 ? (
      <>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
      </>): (
          <p>No products found in this category.</p>
        )}
    </div>
  </section>

  





    // <div>
    //   <h2>Category Page</h2>
    //   <h3>Category ID: {categoryId}</h3>

    //   <h4>Products:</h4>
    //   {products.length > 0 ? (
    //     <ul>
    //       {products.map((product) => (
    //         <li key={product.id}>{product.name}</li>
    //       ))}
    //     </ul>
    //   ) : (
    //     <p>No products found in this category.</p>
    //   )}
    // </div>
  );
};

export default CategoryPage;
