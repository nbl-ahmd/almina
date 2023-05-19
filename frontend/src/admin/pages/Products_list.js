import axios from 'axios';
import React, { useEffect, useState } from 'react'
import ProductCard_admin from '../components/ProductCard_admin';

const  Products_list = () => {

   const [product, setProduct] = useState([]);
   const [productList, setProductList] = useState();
   const [productFilter, setProductFilter] = useState();

   useEffect(() => {
    axios.get('http://192.168.70.104:4000/api/products')
    .then(response => {
      console.log(response.data);
      setProduct(response.data);
        })
        .catch(error => console.log(error));
   },
   []);
   
  return (
    <div>
      <div className="container mb-5">
<div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3">
{product.map(product => (
  <ProductCard_admin key={product.id} product={product} />
))}
</div>
</div>
    </div>
  )
}
export default Products_list;