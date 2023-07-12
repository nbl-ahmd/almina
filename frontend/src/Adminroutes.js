import React from 'react';
import { Route, Navigate } from 'react-router-dom';

const username = 'admins';

const Adminroutes = ({ children }) => {
  return username === 'admisn' ? children : <Navigate to="/admin/login" />;
};

export default Adminroutes;
