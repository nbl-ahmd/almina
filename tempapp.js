
import './client/styles/App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from './client/components/navbar';
import React, { useEffect, useState } from 'react';
import Home from './client/pages/Home';
import About from './client/pages/About';
import Products from './client/pages/Products';
import Categories from './client/pages/Categories'
import FilesUpload from './admin/components/ProductUpload';
import BannerForm from './admin/components/BannerForm';
import BannerCard from './client/components/BannerCard';
import axios from 'axios';
import Dashboard from './admin/pages/dashboard';
import NotFound from './client/pages/NotFound'
import Product from './admin/components/product';
import ProductUpload from './admin/components/ProductUpload';
import CategoryUpload from './admin/components/CategoryUpload';
import Products_list from './admin/pages/Products_list';
import Categoryupdate from './admin/components/Categoryupdate';
import ProductUpdate from './admin/components/ProductUpdate';
import Cart from './client/pages/Cart';
import { CartProvider } from './context/cartcontext';
import Checkout from './client/components/Checkout';
import Orderlist from './admin/components/Orderlist';
import CategoryPage from './client/pages/Categoryproduct';
import Footer from './client/components/footer';
import Batchproduct from './admin/components/Batchproduct';





const DashboardContext = React.createContext()
const DashProvider =  DashboardContext.Provider
export const DashConsumer =  DashboardContext.Consumer

const App = () => {

  return (
    <BrowserRouter>





      <main>
        <Routes>
          <Route path='/cart' element={
            <>
            <CartProvider>
            <Navbar />
            <Cart />
            </CartProvider>
            </>
          }/>
          <Route path='/checkout' element={
            <>
            <CartProvider>
            <Navbar />
            <Checkout />
            </CartProvider>
            </>
          }/>
          <Route path='/' element={
            <>
              <CartProvider>
              <Navbar />
              <Home />
              
              </CartProvider>
            </>} />
          <Route path='products' element={
            <>
            <CartProvider>
            <Navbar />
            <Products />
            </CartProvider>
            </>
          } />
          <Route path='/search' element={
            <>
            <CartProvider>
            <Navbar />
            <Products />
            </CartProvider>
            </>
          } />
          <Route path='/categories' element={
            <CartProvider>
              <Navbar />
            <Categories />
            </CartProvider>
          } />
          
          <Route path='/categories/:categoryId' element={
  <CartProvider>
    <Navbar />
    <CategoryPage />
  </CartProvider>
} />


          <Route path='about' element={
           <CartProvider>
             <Navbar />
            <About />
            <Footer />
           </CartProvider>
          } />
          <Route path='admin' element={
            <>
            <DashProvider value= {<Products_list />}>
              <Dashboard />
            </DashProvider>
            </>
          } />
          <Route path='admin/uploadproduct' element={
            <>
            <DashProvider value= {<>
              <ProductUpload />
           <CategoryUpload />
            </>}>
              <Dashboard />
            </DashProvider>
            </>
          } />
          <Route path='admin/banner' element={
            <>
            <DashProvider value= {<>
              <BannerForm />
            </>}>
              <Dashboard />
            </DashProvider>
            </>
          } />
          <Route path='admin/order' element={
            <>
            <DashProvider value= {<>
              <Orderlist />
            </>}>
              <Dashboard />
            </DashProvider>
            </>
          } />
          <Route path='admin/categories' element={
            <>
            <DashProvider value= {<>
              <CategoryUpload />
            </>}>
              <Dashboard />
            </DashProvider>
            </>
          } />
          <Route path='upload' element={<FilesUpload />} />
          <Route path='/admin/categories/update/:id' element={<Categoryupdate />} />
          <Route path='/admin/product/update/:id' element={<ProductUpdate />} />
          <Route path='uploadbanner' element={<BannerForm />} />
          <Route path='admin/batch' element={<Batchproduct />} />
          {/* <Route path='admin' element={<Dashboard/>} /> */}
        
          <Route path="*" element={<NotFound/>} />

        </Routes>
      </main>
    </BrowserRouter>




  );
}

export default App;
