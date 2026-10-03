import React, { useContext, useEffect, useState } from 'react';
import { CartContext } from '../../context/cartcontext';
import { Link } from 'react-router-dom';
import baseURL from '../../axiosConfig';

const DealProductCard = (product) => {
    const { addToCart } = useContext(CartContext);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
  
    useEffect(() => {
      const image = new Image();
      const defaultImage = "fb634ad3-7062-4baf-a08d-4f8f04abb459.webp";
  image.src = `${baseURL}/api/products/images/${product.image || defaultImage}`;
     
      image.onload = () => {
        setImageLoaded(true);
      };
    }, [product.image]);
  
    const handleAddToCart = () => {
      addToCart(product);
    };
  
    return (
      <>
       <div className="products">

     <div className="card card-product d-flex ">
     <div>
     <img src="http://localhost:4000/api/products/images/41d722fc-a9d3-49f0-8ec7-99e67f9c195a.webp" alt="Product image" class="w-25" />
     </div>

     <div>
        <p>sadsd</p>
     </div>

     </div>
       </div>
      </>
    );
  }

  

export default DealProductCard
