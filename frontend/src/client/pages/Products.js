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

const Products = () => {
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
  const [showLoadMoreButton, setShowLoadMoreButton]= useState(false);
  const location = useLocation();


 
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);


  useEffect(() => {
    axios
      .get(`${baseURL}/api/category`)
      .then((response) => {
        setCategory(response.data);
        console.log(response.data);
      })
      .catch((error) => console.log(error));
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const newSearchQuery = searchParams.get('q');
    setSearchQuery(newSearchQuery || '');
    setSearchOffset(0); // Reset offset when search query changes
    console.log("1  ..... " +searchQuery);
  }, [location.search]);

  useEffect(() => {
    if (searchQuery) {
      search();
      setSearching(true);
      console.log("2 ...." +searchQuery);
    } else {
      setSearchedProducts([]);
      setSearching(false);
    }
  }, [searchQuery]);




  const search = async () => {
    console.log("search offset" + searchOffset)
    try{
    console.log("search ...." +searchQuery);
;
    const response = await axios.get(
      `${baseURL}/api/products/search?`, {
        params: {
          q: searchQuery,
          disabled: false,
          offset: searchOffset,
          limit: limit
        }
      });
      
      
      
      // q=${searchQuery}&offset=${offset}${
      //   searching === false ? `&limit=${limit}` : ''
      // }`
    
    const searchResults = response.data;
   ;


    if (searchOffset === 0){
      setSearchedProducts(searchResults);
      setSearchOffset(prevsearchOffset => prevsearchOffset + limit);
      setLoaded(false);
      setFetchingMore(true);
      
    }else{
      setSearchedProducts(prevItems => [...prevItems, ...searchResults]);
    setSearchOffset(prevsearchOffset => prevsearchOffset + limit);
    }

      
    // setSearchedProducts(searchResults);
   

    if (searchResults.length < limit) {
      setLoaded(true);
      setLoading(false);
      setFetchingMore(false); // Reset fetchingMore state
    } else {
      setFetchingMore(true);
    }
  } catch (error) {
    setError(error);
  }
    }

  const fetchProducts = async () => {
    console.log('fetch products called')
    setLoaded(false); // Reset loaded state before fetching more products
    setIsLoading(true);
    setError(null);
    setShowLoadMoreButton(false);
    let filter
    if (selectedCategory){
       filter = {"category": selectedCategory, "disabled": false };
    }
    else{
      filter = {"disabled": false };
    }
    const filterString = JSON.stringify(filter);
    try {
      const response = await axios.get(`${baseURL}/api/products`, {
        params: {
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
        setOffset(prevOffset => prevOffset + limit);
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
  

  function toggleFilterFunction() {
    setToggleFilter(!toggleFilter);
  }



  return (
    <section className="container" style={{ paddingBottom: '100px' }}>
      <Breadcrumbs />
      <div className="title pt-2 px-4">
        
        <h5>{searchQuery ? `Resuts for "${searchQuery}" ` : 'All Products'}</h5>
        
        </div>
      <div id="scrollableDiv">
    
    <InfiniteScroll
      dataLength={searching ? searchedProducts.length : productList.length}
      next={searching ? search : ()=>{setShowLoadMoreButton(true)}}
      hasMore={searching ? !loaded && fetchingMore : !loaded} // Use both loaded and fetchingMore conditions
      loader={<p className='pb-3 text-center'>{isLoading ? 'Loading...': null }</p>}
      endMessage={<p className='pb-3 text-center'>No more data to load.</p> }
    
    >
      <div className="container ">
    <div className="d-flex justify-content-between p-3 align-items-center ">
        <span>Filter by categories</span>
      <div className='filter-icon-wrapper' onClick={() => toggleFilterFunction()}>
      <i className="bi bi-filter icon"></i>
      </div>
    </div>
    {/*filter*/}
   



    <div className={`card filter-menu py-4 ${toggleFilter ? 'd-none' : 'd-flex'}`}>
      <div className='px-3 d-flex justify-content-between'>
        <h6>
          categories
        </h6>
        <span className='text-pg' onClick={()=> {setSelectedCategory(null)
        setOffset(0)
        toggleFilterFunction()}}>Clear</span>
      </div>
      <ul className=''>
      {category.map((categoryItem) => (
     <li
     className={`py-2 ${selectedCategory === categoryItem._id ? 'active' : ''}`}
     key={categoryItem._id}
     onClick={() => {
      if (selectedCategory === categoryItem._id) {
        setSelectedCategory(null); // Deselect the category
      } else {
        setSelectedCategory(categoryItem._id); // Select the category
      }
      setOffset(0);
      toggleFilterFunction()
      
      
    }}
   >
      {categoryItem.name}
    </li>
  ))}
      </ul>
    </div>
  </div>
      

      <div className="container mb-5">
        <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-5 mt-3 px-2 mb-4">
          {searching
            ? searchedProducts.map(product => (
                <ProductCard key={product._id} product={product} />
              ))
            :
            
              productList.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
        </div>
      </div>
      {showLoadMoreButton && ( // Content rendered when fetchingMore is false
          <div className="text-center">
            <button className="btn btn-sm btn-outline-dark" onClick={fetchProducts}>Load More</button>
          </div>
        )}
    </InfiniteScroll> 
  </div>
    
    </section>
  );
};

export default Products;
