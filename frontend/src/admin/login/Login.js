



import React, { useState } from 'react';
import { useAuthentication } from '../login/auth';
import { Alert } from '@mui/material';




const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage]= useState();

  const [showPassword, setShowPassword] = useState(false);
  const { authenticate } = useAuthentication();

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };


  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      // Call the authentication function
      await authenticate(username, password);
    } catch (error) {
      // Handle authentication error
      setMessage('Incorrect username or password');
      console.log('erors');
    }
  }

  return (
    <main className='login-body'>
      <div className="container-xxl">
        <div className="authentication-wrapper authentication-basic container-p-y">
          <div className="authentication-inner">
            <div className="card login-card">
              <div className="card-body p-4">
                <div className="app-brand justify-content-center">
                  {/* Logo */}
                </div>
                <h5 className="mb-2 fw-400">Welcome to Al mina! 👋</h5>
                <p className="mb-4 fw-300 text-small">Please sign-in to your account and start the adventure </p>
{message && <Alert severity='error'>{message}</Alert>}
                <form onSubmit={handleSubmit} className="mb-3">
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label text-small">Username</label>
                    <input type="text" id="username" className="form-control" value={username} onChange={handleUsernameChange} />
                  </div>
                  <div className="mb-3 form-password-toggle">
                    <div className="d-flex justify-content-between">
                      <label htmlFor="password" className="form-label">Password</label>
                      <a href="auth-forgot-password-basic.html">
                        <small>Forgot Password?</small>
                      </a>
                    </div>
                    <div className="input-group input-group-merge">
                      <input type={showPassword ? 'text' : 'password'} id="password" className="form-control border-end-0" value={password} onChange={handlePasswordChange} placeholder="" aria-describedby="password" />
                      <span className="input-group-text cursor-pointer bg-white border-start-0" onClick={handleTogglePasswordVisibility}>
                        {showPassword ?<i class="ri-eye-line"></i> :<i className="ri-eye-close-line"></i>}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    
                  </div>
                  <div className="mb-3">
                    <button className="btn btn-primary btn-p d-grid w-100" type="submit">Sign in</button>
                  </div>
                </form>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;

