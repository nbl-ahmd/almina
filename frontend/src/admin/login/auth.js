import { useNavigate } from 'react-router-dom';
import baseURL from '../../axiosConfig';

export const authenticateUser = async (username, password) => {
  try {
    const response = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const { token, name, role, cities } = await response.json();
      localStorage.setItem('token', token);
      localStorage.setItem('name', name);
      localStorage.setItem('role', role);
      localStorage.setItem('cities', JSON.stringify(cities));
      return { name, role };
    } else {
      throw new Error('Invalid username or password');
    }
  } catch (error) {
    throw new Error('Login failed');
  }
};

export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('name');
  localStorage.removeItem('role');
  localStorage.removeItem('cities');
};

export const useAuthentication = () => {
  const navigate = useNavigate();

  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

  const authenticate = async (username, password) => {
    try {
      const { name, role } = await authenticateUser(username, password);
      if (role === 'admin') {
        navigate('/admindash');
      } else if (role === 'user') {
        navigate('/admin');
      }
    } catch (error) {
      console.error('Login failed', error);
      // Handle login error
      throw error;
    }
  };

  const logout = () => {
    logoutUser();
    navigate('/admin/login');
  };

  return {
    isAuthenticated,
    authenticate,
    logout,
  };
};
