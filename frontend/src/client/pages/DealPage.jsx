import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import baseURL from '../../axiosConfig';
import Productskeleton from '../components/Productskeleton';
import { v4 as uuidv4 } from 'uuid';
import BackToTopButton from '../components/BackToTopButton';
import InfiniteScroll from 'react-infinite-scroll-component';
import Breadcrumbs from '../components/Breadcrumbs';
import Footer from '../components/footer';
import { CustomHelmet } from '../components/CustomHelmet';


const DealPage = () => {

    const [productList, setProductList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [searchOffset, setSearchOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [loaded, setLoaded] = useState(false); // Move loaded state here
  const [category, setCategory] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [toggleFilter, setToggleFilter]= useState(true);
  const location = useLocation();


  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    
    setLoaded(false); // Reset loaded state before fetching more products
    setIsLoading(true);
    setError(null);
    
    const  filter = {
        "disabled": false,
        "sale": true,
 };
    const filterString = JSON.stringify(filter);
    try {
      const response = await axios.get(`${baseURL}/api/products`, {
        params: {
          disabledCat: false,
          filter: filterString,
          disabled: false,
          offset: offset,
          limit: searching === false ? limit : undefined,
          category: selectedCategory,
        },
      });
      const data = response.data;

      if (offset === 0){
        setProductList(data);
        setOffset(limit);
      }else{
        setProductList(prevItems => [...prevItems, ...data]);
      setOffset(prevOffset => prevOffset + limit);
      }
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
    <CustomHelmet 
    title ={'Top deals'}
    description = {'Discover exclusive deals at Al Mina Pharmacy, your trusted destination for premium healthcare products in Ras Al Khaimah. From Vitamin C serums to Advil 12-hour extended release tablets, we cater to your diverse needs. Find quality items like Cipla HUF PUF Kit, Betadine for throat gargle, and Baneocin ointment. Explore Betadine vaginal pessaries, Avalon Active Cream, and Cetaphil offers in the UAE. Whether you seek Advil 12-hour tablets, Alka Cran, or Avalon Diaper Cream, our pharmacy near you in Ras Al Khaimah ensures convenience. Unlock savings on Bepanthen Plus, Adol Infant Drops 100mg, and a variety of vitamin supplements, including Vitamin D and Vitamin B12. Dive into top-notch products like Skinceuticals CE Ferulic and explore drug stores close to you for the best medical supplies. Benefit from Betadine liquid mouthwash, Bepanthen Hydrating Cream, and Betadine Cold Defense Nasal Spray. Your health is our priority, making us the go-to pharmacy for your well-being in Ras Al Khaimah'}
    url = {'https://www.alminapharmacy.com/offers'}
    image = {'https://almina-shop.onrender.com/api/banners/images/8f4c5405-af45-4a09-a32c-cfdabd77934f.webp'}
    />
    <section className="container" style={{ paddingBottom: '100px' }}>
      <Breadcrumbs />
      <div className="title pt-1 px-4">
        
        <h5>Offers</h5>
        
        </div>
      <div id="scrollableDiv">
      {productList.length === 0 &&
      <div className="container mb-5">
      <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-5 mt-3 px-2 mb-4">
      {productList.length === 0 && Array.from({ length: 10 }).map((_, index) => (
      <Productskeleton key={index} />
    ))}
      </div>
    </div>}
    <InfiniteScroll
      dataLength={searching ? searchedProducts.length : productList.length}
      next={fetchProducts}
      hasMore={!loaded} // Use both loaded and fetchingMore conditions
      loader={<p className='pb-3 text-center'>{isLoading ? 'Loading...' : 'No more data to load.'}</p>}
      endMessage={<p className='pb-3 text-center'>No more data to load.</p>}
    
    >
       <div className="container mb-5">
        <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-5 mt-3 px-2 mb-4">
          {
            
              productList.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
        </div>
      </div>
    </InfiniteScroll> 
  </div>
  <BackToTopButton />
    </section>
    </>
  )
}

export default DealPage
