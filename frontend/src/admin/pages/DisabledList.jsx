import axios from 'axios';
import React, { useEffect, useState } from 'react'
import ProductCard_admin from '../components/ProductCard_admin';
import baseURL from '../../axiosConfig';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useLocation } from 'react-router-dom';
import BackToTopButton from '../../client/components/BackToTopButton';
import ProductCardPharmacy from '../components/ProductCardPharmacy';
import { Box, Card, Container, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { red } from '@mui/material/colors';
import { Button, Modal } from 'react-bootstrap';
import ProductUpdate from '../components/ProductUpdate';
import ProductEditPharmacy from '../components/ProductEditPharmacy';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [toggleFilter, setToggleFilter]= useState(true);
  const location = useLocation();

  function getSaleTypeClass(saleType) {
    switch (saleType) {
      case 'price_cut':
        return 'bg-p-or'; // Replace with your actual class name
      case 'percentage_offer':
        return 'offer-badge'; // Replace with your actual class name
      case 'combo_offer':
        return 'bg-p-pu'; // Replace with your actual class name
      default:
        return 'bg-p-or'; // Default class when saleType doesn't match any specific type
    }
  }
  const handleEditClick = () => {
    setShowEditModal(true);
  };
  
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
  const updatedProducts = (data) => {
    setProducts(data);
  }

  const handleToggleProduct = async (productToToggle) => {
    // Make an API request to update the 'disabled' property of the product
    // You should pass the product ID or some identifier to the API to update the specific product.
    // After updating, set the new 'disabled' value in the state.
    try {
      console.log(productToToggle._id);
      await axios.put(`${baseURL}/api/products/publish/${productToToggle._id}`);
    } catch (error) {
      console.error('Error dispatching order:', error);
    }
  
    // For demonstration purposes, I'll assume the product is updated immediately.
    const updatedProduct = { ...productToToggle, disabled: !productToToggle.disabled };
  
    // Update the 'productList' state with the new value
    setProductList((prevProductList) =>
      prevProductList.map((product) =>
        product._id === productToToggle._id ? updatedProduct : product
      )
    );
  };
  

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
      setSearchOffset(limit);
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
       filter = {"category": selectedCategory, "disabled": true };
    }
    else{
      filter = {"disabled": true };
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
          disabledCat: false,
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
        loader={<p className='pb-3 text-center'>{isLoading ? 'Loading...' : 'No more data to load.'}</p>}
        endMessage={<p className='pb-3 text-center'>No more data to load.</p>}
      
      >
       
        

        <div className="">
          <div className="">
            {searching
              ? 


              <Container>
                <Card sx={{borderRadius:'10px', my:5, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px'}}>
                <div className="d-flex justify-content-between p-3 align-items-center ">
                  <span>Filter by categories</span>
                <div className='filter-icon-wrapper' onClick={() => toggleFilterFunction()}>
                <i className="bi bi-filter icon"></i>
                </div>
              </div>

              <div className="container">
      
      {/*filter*/}
     



      <div className={`card filter-menu py-4  mb-3 ${toggleFilter ? 'd-none' : 'd-flex'}`}>
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
                <TableContainer>
                    <Table sx={{'th': { border: 0, fontFamily: 'Poppins, sans-serif' , fontWeight:'500'}, 'td': { border: 0, fontFamily: 'Poppins, sans-serif' , fontWeight:'400', borderBottom: '1px solid rgb(244, 246, 248)'}}} aria-label="simple table">
                        <TableHead sx={{ backgroundColor: 'rgb(244, 246, 248)'}}>
                        <TableRow sx={{}} >
                    <TableCell>Product</TableCell>
                    <TableCell align="left">Stock</TableCell>
                    <TableCell align="left">Price</TableCell>
                    <TableCell align="left">Publish</TableCell>
                  </TableRow>
                        </TableHead>
                        <TableBody>
                        {searchedProducts.map(product => (
                    <TableRow
                      key={product.name}
                      sx={{fontFamily: 'Poppins, sans-serif'}}
                    >
                      <TableCell >
                       <Box sx={{display: 'flex',
                   alignItems: 'center',
                   maxWidth:'500px'}}>
                       <img src=
                        {`${baseURL}/api/products/images/${product.image}`} width={'100px'} className='me-2 border border-1 rounded-3'/>
                        <Box sx={{ml:2}} >
                        <span>
                                          {product.sale &&
                                      <span className={`badge mb-2 ${getSaleTypeClass(product.saleType)}`}>{product.saleBadge || 'sale'}</span>
                                      }
                                          </span>
                        <p className='mb-1'>
                        {product.name}
                        </p>
                        <p className='fw-300'>
                        {product.category.name}
                        </p>
                        </Box>
                       </Box>
                      </TableCell>
                      
                      <TableCell align="left">{product.stock}</TableCell>
                      <TableCell align="left">AED {product.price}</TableCell>
                      <TableCell align="left">
          <Switch
            checked={!product.disabled}
            onChange={() => handleToggleProduct(product)}
            color="primary"
            name="toggleProduct"
            inputProps={{ 'aria-label': 'toggle product' }}
          />
        </TableCell>
                      
                    </TableRow>
                  ))}
                </TableBody>
                    </Table>
                </TableContainer>
                </Card>
            </Container>
                
              :
              

                  <Container>
        <Card sx={{borderRadius:'10px', my:5, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px'}}>
        <div className="d-flex justify-content-between p-3 align-items-center ">
          <span>Filter by categories</span>
        <div className='filter-icon-wrapper' onClick={() => toggleFilterFunction()}>
        <i className="bi bi-filter icon"></i>
        </div>
      </div>

      <div className="container">
      
      {/*filter*/}
     



      <div className={`card filter-menu py-4  mb-3 ${toggleFilter ? 'd-none' : 'd-flex'}`}>
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
        <TableContainer>
            <Table sx={{'th': { border: 0, fontFamily: 'Poppins, sans-serif' , fontWeight:'500'}, 'td': { border: 0, fontFamily: 'Poppins, sans-serif' , fontWeight:'400', borderBottom: '1px solid rgb(244, 246, 248)'}}} aria-label="simple table">
                <TableHead sx={{ backgroundColor: 'rgb(244, 246, 248)'}}>
                <TableRow sx={{}} >
            <TableCell>Product</TableCell>
            <TableCell align="left">Stock</TableCell>
            <TableCell align="left">Price</TableCell>
            <TableCell align="left">Publish</TableCell>
            <TableCell align="left">Action</TableCell>
          </TableRow>
                </TableHead>
                <TableBody>
          {productList.map(product => (
            <TableRow
              key={product.name}
              sx={{fontFamily: 'Poppins, sans-serif'}}
            >
              <TableCell >
               <Box sx={{display: 'flex',
           alignItems: 'center',
           maxWidth:'500px'}}>
               <img src=
                {`${baseURL}/api/products/images/${product.image}`} width={'100px'} className='me-2 border border-1 rounded-3'/>
                <Box sx={{ml:2}} >
                <span>
                                  {product.sale &&
                              <span className={`badge mb-2 ${getSaleTypeClass(product.saleType)}`}>{product.saleBadge || 'sale'}</span>
                              }
                                  </span>
                <p className='mb-1'>
                {product.name}
                </p>
                <p className='fw-300'>
                {product.category.name}
                </p>
                </Box>
               </Box>
              </TableCell>
              
              <TableCell align="left">{product.stock}</TableCell>
              <TableCell align="left">AED {product.price}</TableCell>
              <TableCell align="left">
  <Switch
    checked={!product.disabled}
    onChange={() => handleToggleProduct(product)}
    color="primary"
    name="toggleProduct"
    inputProps={{ 'aria-label': 'toggle product' }}
  />
  
</TableCell>
<TableCell align="left"><div className=' d-flex  '>
                      <button className="btn btn-sm d-flex" onClick={() =>{
                        handleEditClick();
                        setProducts(product);
                        }}>
                  <i className="bi bi-pen pe-2 text-pg text-sm"></i>
                  <span className="text-pg text-sm">Edit</span>
                </button>
                      </div></TableCell>
              
            </TableRow>
          ))}
        </TableBody>
            </Table>
        </TableContainer>
        </Card>
    </Container>
                  // <ProductCardPharmacy key={product._id} productData={product} />
               }
          </div>
        </div>
      </InfiniteScroll> 
    </div>
    <Modal centered show={showEditModal} fullscreen={false} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Product</Modal.Title>
          </Modal.Header>
          <Modal.Body>
          {/**add here */}
            <ProductEditPharmacy id = {products._id} products = {products} editedProduct = {updatedProducts} />
          </Modal.Body>
          
        </Modal>
        
    </>
  );
};

export default Products_list;