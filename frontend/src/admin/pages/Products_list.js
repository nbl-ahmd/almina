import axios from 'axios';
import React, { useEffect, useState } from 'react'
import ProductCard_admin from '../components/ProductCard_admin';
import baseURL from '../../axiosConfig';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useLocation } from 'react-router-dom';
import BackToTopButton from '../../client/components/BackToTopButton';
import { Button, Card, CardContent, Container, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import ProductUpload from '../components/ProductUpload';

const Products_list = () => {
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
  const [showProductModal, setShowProductModal] = useState(false);

  const [toggleFilter, setToggleFilter]= useState(true);
  const location = useLocation();

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);
  useEffect(() => {
    try{
      const filter = { "disabled": false };
      const filterString = JSON.stringify(filter);
      axios
      .get(`${baseURL}/api/category?filter=${encodeURIComponent(filterString)}`)
      .then((response) => {
        setCategory(response.data);
        console.log(response.data);
      })
     }
     catch (error) {
      console.error('Error fetching products by category:', error);
    }
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
          limit: limit,
          disabledCat: false,
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
  

  function toggleFilterFunction() {
    setToggleFilter(!toggleFilter);
  }

  return (
    <>
    
    <div id="scrollableDiv">
      <InfiniteScroll
        dataLength={searching ? searchedProducts.length : productList.length}
        next={searching ? search : fetchProducts}
        hasMore={searching ? !loaded && fetchingMore : !loaded} // Use both loaded and fetchingMore conditions
        loader={<p className='pb-3 text-center mt-4'>{isLoading ? 'Loading...' : 'No more data to load.'}</p>}
        endMessage={<p className='pb-3 text-center'>No more data to load.</p>}
      
      >
        
        

        <Container sx={{mt:2}}>
          <h6 className='px-2 mt-4'>Products</h6>
          <Card sx={{ mt:5, borderRadius:'15px', boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px'}}>
          <Container sx={{ px:3, boxShadow: 'rgba(145, 158, 171, 0.08) 0px -2px 0px 0px inset', py:1}}>
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
    </Container>
          <CardContent sx={{px:1}}>
          <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-5 mt-3 px-2 mb-4">
            {searching
              ? searchedProducts.map(product => (
                  <ProductCard_admin key={product._id} productData={product} />
                ))
              :
              
                productList.map(product => (
                  <ProductCard_admin key={product._id} productData={product} />
                ))}
          </div>
          </CardContent>
          </Card>
        </Container>
      </InfiniteScroll> 
      <button className=" d-flex add-category-btn" onClick={() =>{
                        setShowProductModal(true);
                        }}>+
                </button>
    </div>
    <Dialog sx={{
    backdropFilter: "blur(3px)",
  }}
  // 👇 Props passed to Paper (modal content)
  PaperProps={{ sx: { borderRadius: "20px", p:1 } }} open={showProductModal} onClose={() => setShowProductModal(false)}>
        <DialogTitle sx={{color: 'black'}}>Add new product</DialogTitle>
        <DialogContent sx={{pb:0}}>
        <ProductUpload />
            
        </DialogContent>
       
      </Dialog>
    </>
  );
};

export default Products_list;