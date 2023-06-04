import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';

const Map = () => {
  const [selectedPosition, setSelectedPosition] = useState(null);

  // Custom hook to listen to map click events
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        setSelectedPosition(e.latlng);
      },
    });
    return null;
  };

  const handleSearch = (e) => {
    // Implement your search functionality here
    console.log('Searching for:', e.target.value);
  };

  return (
    <div className="map-container">
      <div className="search-container">
        <input type="text" placeholder="Search location" onChange={handleSearch} />
      </div>
      <div className="leaflet-container">
        <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '400px' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler />
          {selectedPosition && (
            <Marker position={selectedPosition}>
              <Popup>
                Selected location: {selectedPosition.lat}, {selectedPosition.lng}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default Map;
