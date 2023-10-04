
import './client/styles/App.css';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
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

import Login from './admin/login/Login'
import Admindash from './admin/pages/Admindash';
import Adduser from './admin/pages/Adduser';
import Openstreet from './client/components/Openstreet';
import BackToTopButton from './client/components/BackToTopButton';





const DashboardContext = React.createContext()
const DashProvider =  DashboardContext.Provider
export const DashConsumer =  DashboardContext.Consumer

const AdminDashboardContext = React.createContext()
const AdminDashProvider =  AdminDashboardContext.Provider
export const AdminDashConsumer =  AdminDashboardContext.Consumer


const Adminroutes = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!isAuthenticated || role !== 'user') {
    return <Navigate to="/admin/login" />;
  }

  return children;
};

const AdminProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!isAuthenticated || role !== 'admin') {
    return <Navigate to="/admin/login" />;
  }

  return children;
};


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
<Route path='admin/login' element={
            <Login />
          } />



          <Route path='admin' element={
            <Adminroutes>
            <DashProvider value= {<Orderlist />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          
          <Route path='/admin/productlist' element={
            <Adminroutes>
            <DashProvider value= {<Products_list />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/productlist/search' element={
            <Adminroutes>
            <DashProvider value= {<Products_list />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />


          <Route path='admindash' element={
              <AdminProtectedRoute>
              <AdminDashProvider value= {<>
                <ProductUpload />
             <CategoryUpload />
              </>}>
                <Admindash />
              </AdminDashProvider>
              </AdminProtectedRoute>
          } />
          <Route path='admindash/uploadproduct' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {<>
              <ProductUpload />
           <CategoryUpload />
            </>}>
              <Admindash />
            </AdminDashProvider>
            </AdminProtectedRoute>
          } />
          <Route path='admindash/banner' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {<>
              <BannerForm />
            </>}>
              <Admindash />
            </AdminDashProvider>
            </AdminProtectedRoute>
          } />
          <Route path='admin/order' element={
            <Adminroutes>
            <DashProvider value= {<>
              <Orderlist />
            </>}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='admindash/categories' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {<>
              <CategoryUpload />
            </>}>
              <Admindash />
            </AdminDashProvider>
            </AdminProtectedRoute>
          } />




          <Route path='admindash/batch' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {<>
              <Batchproduct />
            </>}>
              <Admindash />
            </AdminDashProvider>
            </AdminProtectedRoute>
          } />

          <Route path='admindash/users' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {<>
              <Adduser />
            </>}>
              <Admindash />
            </AdminDashProvider>
            </AdminProtectedRoute>
          } />





          {/* <Route path='upload' element={<FilesUpload />} /> */}
          <Route path='/admin/categories/update/:id' element=
          
          {<Adminroutes>
            <Categoryupdate />
            </Adminroutes>} />


            <Route path='/admindash/categories/update/:id' element={
              <AdminProtectedRoute>
              <AdminDashProvider value= {<>
                <Categoryupdate />
              </>}>
                <Admindash />
              </AdminDashProvider>
              </AdminProtectedRoute>
          } />


          <Route path='/admin/product/update/:id' element={
          <Adminroutes>
            <ProductUpdate />
          </Adminroutes>
          
        
        } />
          {/* <Route path='uploadbanner' element={<BannerForm />} /> */}
         
          {/* <Route path='admin' element={<Dashboard/>} /> */}
        
          <Route path="*" element={<NotFound/>} />
          <Route path="/map" element={<Openstreet/>} />

        </Routes>
        <BackToTopButton />
      </main>
    </BrowserRouter>




  );
}

export default App;
