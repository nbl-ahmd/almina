
import './client/styles/App.css';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './client/components/navbar';
import React, { useEffect, useState } from 'react';
import Home from './client/pages/Home';
import About from './client/pages/About';
import Products from './client/pages/Products';
import Categories from './client/pages/Categories'
import Cart from './client/pages/Cart';
import Checkout from './client/components/Checkout';
import DealPage from './client/pages/DealPage';

import BannerForm from './admin/components/BannerForm';
import Dashboard from './admin/pages/dashboard';
import NotFound from './client/pages/NotFound'
import ProductUpload from './admin/components/ProductUpload';
import CategoryUpload from './admin/components/CategoryUpload';
import Products_list from './admin/pages/Products_list';
import Categoryupdate from './admin/components/Categoryupdate';
import ProductUpdate from './admin/components/ProductUpdate';

import { CartProvider } from './context/cartcontext';

import Orderlist from './admin/components/Orderlist';
import CategoryPage from './client/pages/Categoryproduct';
import Footer from './client/components/footer';
import Batchproduct from './admin/components/Batchproduct';

import Login from './admin/login/Login'
import Admindash from './admin/pages/Admindash';
import Adduser from './admin/pages/Adduser';
import Openstreet from './client/components/Openstreet';
import SalesList from './admin/pages/SalesList';
import OutOfStock from './admin/pages/OutOfStock';
import Dispatched from './admin/components/Dispatched';
import ProductsPharmacy from './admin/pages/ProductsPharmacy';
import OrderDetails from './admin/pages/OrderDetails';
import DisabledList from './admin/pages/DisabledList';
import SettingsPage from './admin/pages/SettingsPage';
import Contact from './client/pages/Contact';
import OutOfStockPharmacy from './admin/pages/OutOfStockPharmacy';
import WhatsappMessaging from './admin/pages/WhatsappMessaging';
import Cancelled from './admin/components/Cancelled';

import ProductDetails from './client/pages/ProductDetails';





const DashboardContext = React.createContext()
const DashProvider =  DashboardContext.Provider
export const DashConsumer =  DashboardContext.Consumer

const AdminDashboardContext = React.createContext()
const AdminDashProvider =  AdminDashboardContext.Provider
export const AdminDashConsumer =  AdminDashboardContext.Consumer

const MaintenanceLanding = () => {
  const whatsappUrl = 'https://wa.me/971504825007';
  const containerStyle = {
    minHeight: '100vh',
    margin: 0,
    background: 'linear-gradient(135deg, #031226, #08223d)',
    color: '#f5f7fb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center'
  };
  const cardStyle = {
    maxWidth: '520px',
    width: '100%',
    background: 'rgba(3, 12, 27, 0.8)',
    borderRadius: '18px',
    padding: '2.75rem 2.25rem',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.55)'
  };
  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '999px',
    padding: '0.95rem 1.6rem',
    fontWeight: 600,
    background: '#25d366',
    color: '#05210f',
    textDecoration: 'none',
    marginTop: '1.5rem',
    boxShadow: '0 18px 35px rgba(37, 211, 102, 0.35)'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ textTransform: 'uppercase', letterSpacing: '0.25em', fontSize: '0.75rem', color: '#8fa6c3' }}>Temporarily offline</p>
        <h1 style={{ fontSize: '2.1rem', marginBottom: '1rem' }}>We are upgrading the pharmacy</h1>
        <p style={{ lineHeight: 1.6, fontSize: '1.05rem', color: '#c9d8ef' }}>
          Our storefront is undergoing scheduled maintenance. If you need to place an order or have a question, tap the
          WhatsApp button below and our team will respond right away.
        </p>
        <a href={whatsappUrl} style={buttonStyle} target="_blank" rel="noopener noreferrer">
          Chat on WhatsApp
        </a>
      </div>
    </div>
  );
};


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
  const maintenanceEnabled = process.env.REACT_APP_MAINTENANCE_MODE === 'true';

  useEffect(() => {
    if (maintenanceEnabled) {
      return;
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(function(registration) {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(function(error) {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [maintenanceEnabled]);

  if (maintenanceEnabled) {
    return (
      <HelmetProvider>
        <MaintenanceLanding />
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
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
              <Footer />
              </CartProvider>
            </>} />
          <Route path='products' element={
            <>
            <CartProvider>
            <Navbar />
            <Products />
            </CartProvider>
            <Footer />
            </>
          } />
          <Route path='productdetails/:id' element={
            <>
            <CartProvider>
            <Navbar />
            <ProductDetails />
            </CartProvider>
            <Footer />
            </>
          } />
          <Route path='offers' element={
            <>
            <CartProvider>
            <Navbar />
            <DealPage />
            </CartProvider>
            <Footer />
            </>
          } />
          <Route path='/search' element={
            <>
            <CartProvider>
            <Navbar />
            <Products />
            </CartProvider>
            <Footer />
            </>
          } />
          <Route path='/categories' element={
            <CartProvider>
              <Navbar />
            <Categories />
            <Footer />
            </CartProvider>
          } />
          
          <Route path='/categories/:categoryId' element={
  <CartProvider>
    <Navbar />
    <CategoryPage />
    <Footer />
  </CartProvider>
} />


          <Route path='about' element={
           <CartProvider>
             <Navbar />
            <About />
            <Footer />
           </CartProvider>
          } />
          <Route path='contact' element={
           <CartProvider>
             <Navbar />
            <Contact />
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
          <Route path='admin/orders/:OrderId' element={
            <Adminroutes>
            <DashProvider value= {<OrderDetails />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          
          <Route path='/admin/productlist' element={
            <Adminroutes>
            <DashProvider value= {<ProductsPharmacy />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/disabled' element={
            <Adminroutes>
            <DashProvider value= {<DisabledList />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/salelist' element={
            <Adminroutes>
            <DashProvider value= {<SalesList />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/salelist/search' element={
            <Adminroutes>
            <DashProvider value= {<SalesList />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/productlist/search' element={
            <Adminroutes>
            <DashProvider value= {<ProductsPharmacy />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/outofstock' element={
            <Adminroutes>
            <DashProvider value= {<OutOfStockPharmacy />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/outofstock/search' element={
            <Adminroutes>
            <DashProvider value= {<OutOfStock />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/dispatched' element={
            <Adminroutes>
            <DashProvider value= {<Dispatched />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />
          <Route path='/admin/cancelled' element={
            <Adminroutes>
            <DashProvider value= {<Cancelled />}>
              <Dashboard />
            </DashProvider>
            </Adminroutes>
          } />


          <Route path='admindash' element={
              <AdminProtectedRoute>
              <AdminDashProvider value= {<>
                <Products_list />
              </>}>
                <Admindash />
              </AdminDashProvider>
              </AdminProtectedRoute>
          } />
          <Route path='admindash/products/search' element={
              <AdminProtectedRoute>
              <AdminDashProvider value= {<>
                <Products_list />
              </>}>
                <Admindash />
              </AdminDashProvider>
              </AdminProtectedRoute>
          } />
          <Route path='admindash/outofstock/search' element={
              <AdminProtectedRoute>
              <AdminDashProvider value= {<>
                <OutOfStock />
              </>}>
                <Admindash />
              </AdminDashProvider>
              </AdminProtectedRoute>
          } />

          <Route path='admindash/salelist/search' element={
              <AdminProtectedRoute>
              <AdminDashProvider value= {<>
                <SalesList />
              </>}>
                <Admindash />
              </AdminDashProvider>
              </AdminProtectedRoute>
          } />

          <Route path='admindash/categories/search' element={
              <AdminProtectedRoute>
              <AdminDashProvider value= {<>
                <Products_list />
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
          <Route path='admindash/products' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {
              <Products_list />
            }>
              <Admindash />
            </AdminDashProvider>
            </AdminProtectedRoute>
          } />
          <Route path='admindash/salelist' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {<SalesList />}>
              <Admindash />
            </AdminDashProvider>
            </AdminProtectedRoute>
          } />
          <Route path='admindash/outofstock' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {<OutOfStock />}>
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
          <Route path='admindash/settings' element={
            <AdminProtectedRoute>
            <AdminDashProvider value= {<>
              <SettingsPage />
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
            <Route path='/admindash/whatsapp' element={
              <AdminProtectedRoute>
              <AdminDashProvider value= {<>
                <WhatsappMessaging />
              </>}>
                <Admindash />
              </AdminDashProvider>
              </AdminProtectedRoute>
          } />


          <Route path='/admin/productlist/update/:id' element={
          <Adminroutes>
            <ProductUpdate />
          </Adminroutes>
          
        
        } />
          {/* <Route path='uploadbanner' element={<BannerForm />} /> */}
         
          {/* <Route path='admin' element={<Dashboard/>} /> */}
        
          <Route path="*" element={<NotFound/>} />
          <Route path="/map" element={<Openstreet/>} />

        </Routes>
        
        
      </main>
    </BrowserRouter>
    </HelmetProvider>



  );
}

export default App;
