import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Adduser = () => {
  const [suburbs, setSuburbs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
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

    fetchData();
  }, []);

  return (
    <div className="container mt-5">
      <h3>Suburbs in Ras Al Khaimah:</h3>
      <ul>
        {suburbs.map((suburb) => (
          <li key={suburb.id}>{suburb.tags['name:en']}</li>
        ))}
      </ul>
    </div>
  );
};

export default Adduser;
