import React, { useEffect, useState } from 'react';
import axios from 'axios';
import baseURL from '../../axiosConfig';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Productskeleton from '../components/Productskeleton';
import Breadcrumbs from '../components/Breadcrumbs';
import BackToTopButton from '../components/BackToTopButton';
import { CustomHelmet } from '../components/CustomHelmet';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const [products, setProducts] = useState([]);
  const [catname, setCatname] = useState('');


  useEffect(() => {
    axios.get(`${baseURL}/api/category/${categoryId}`).then((response) => {
       
        setCatname(response.data.name);
      })
   

    fetchProductsByCategory(categoryId);
  }, [categoryId]);

  const fetchProductsByCategory = async (categoryId) => {
    try {
      const filter = {"category": categoryId, "disabled": false };
    const filterString = JSON.stringify(filter);
        const response = await axios.get(`${baseURL}/api/products?filter=${encodeURIComponent(filterString)}`, {
          params: {
            disabledCat: false,
            
          },
        });
        setProducts(response.data);
       
       
     
    } catch (error) {
      console.error('Error fetching products by category:', error);
    }
  };


  return (
<>
<CustomHelmet 
    title ={catname}
    description = {`Explore a diverse range of products for ${catname} at Al Mina Pharmacy. Shop high-quality essentials, including ${products?.[0]?.name} and more. Our curated selection caters to your skincare needs, ensuring you have access to the best solutions. Discover effective products for a radiant and healthy skin routine. Shop now for expert-recommended solutions at Al Mina Pharmacy.`}
    url = {`https://www.alminapharmacy.com/categories/${categoryId}`}
    image = {`${baseURL}/api/category/images/${products?.[0]?.category?.image || ''}`}
    />
    <section className='container h-100'>
    <Breadcrumbs catname = {catname} />
    <div className="title pt-1 px-4 mb-4">
        <h6>{catname}</h6>
      </div>
      <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3">

      {products.length === 0 && Array.from({ length: 10 }).map((_, index) => (
        <Productskeleton key={index} />
      ))}
      {products.length > 0 ? (
      <>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
      </>): (
          <p>No products found in this category.</p>
        )}
    </div>
    <BackToTopButton />
  </section>

</>
  


  );
};

export default CategoryPage;
