import React, { useState, useEffect } from 'react';
import axios from 'axios';
import baseURL from '../../axiosConfig';

const AddUser = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [suburbs, setSuburbs] = useState([]);
  const [userDetails, setUserDetails] = useState(null); // State to store user details

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/auth/users`);

        if (response.status === 200) {
          setUserDetails(response.data); // Store the user details in state
        } else {
          console.error('Failed to fetch users');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchUsers();
    const fetchSuburbs = async () => {
      try {
        const response = await axios.get(
          'https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];area["ISO3166-2"="AE-RK"][admin_level=4];(node["place"="suburb"](area);way["place"="suburb"](area);relation["place"="suburb"](area););out;'
        );

        if (response.status === 200) {
          setSuburbs(response.data.elements);
        } else {
          console.error('Failed to fetch suburbs');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchSuburbs();
  }, []);

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handleRoleChange = (event) => {
    setRole(event.target.value);
  };

  const handleCityChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedCities([...selectedCities, value]);
    } else {
      setSelectedCities(selectedCities.filter((city) => city !== value));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      // Call the signup API with the provided user data
      const response = await fetch(`${baseURL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, name, role, cities: selectedCities }),
      });

      if (response.ok) {
        // Signup successful, navigate to admin dashboard
        setMessage('User created');
      } else {
        // Handle signup error
        console.error('Signup failed');
        setMessage('User creation failed');
      }
    } catch (error) {
      console.error('Signup failed', error);
    }
  };

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <div className="container mt-5 admin">
      <div className="row">
        <div className="col-lg-6">
              <h3 className="card-title mb-2">Add User</h3>
          <div className="card mb-3">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username:</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={handleUsernameChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password:</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={handlePasswordChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="name">Name:</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={handleNameChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role:</label>
                  <select
                    id="role"
                    value={role}
                    onChange={handleRoleChange}
                    className="form-control"
                  >
                    <option value="">Select role</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <button className="btn btn-p" type="button" onClick={openModal}>
                  Select Cities
                </button>
                <br />
                <button className="btn btn-p mt-3" type="submit">
                  Add User
                </button>
              </form>
              <div className="text-sm text-pr text-center mt-3">
                <span>{message}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className=" mb-3">
            <div className="card-body">
              <h3 className="card-title mb-3">User Details</h3>
              {userDetails ? (
                userDetails.map((user) => (
                  <div className='card mb-3 p-2' key={user.id}>
                    <span>Username: {user.username}</span>
                    <span>Name: {user.name}</span>
                    <span>Role: {user.role}</span>
                    <span>Cities:</span>
                    <ul>
                      {user.cities.map((city) => (
                        <li key={city}>{city}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p>No user details available.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="modal">
          <div className="modal-wrapper p-4">
            <div className="d-flex justify-content-between">
              <h4>Select Cities</h4>
              <div className="btn" onClick={closeModal}>
                <i className="bi bi-x-square-fill"></i>
              </div>
            </div>
            <div className="modal-content p-2">
              <div className="city-checkboxes d-flex flex-wrap">
                {suburbs.map((suburb) => (
                  <div key={suburb.id} className="form-check col-6">
                    <input
                      type="checkbox"
                      id={suburb.id}
                      value={suburb.tags['name:en']}
                      onChange={handleCityChange}
                      checked={selectedCities.includes(suburb.tags['name:en'])}
                      className="form-check-input"
                    />
                    <label htmlFor={suburb.id} className="form-check-label">
                      {suburb.tags['name:en']}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-p mt-3" type="button" onClick={closeModal}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddUser;
