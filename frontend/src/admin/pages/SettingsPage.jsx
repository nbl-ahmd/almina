import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Switch from '@mui/material/Switch';
import { Container, Tab, Tabs, createTheme, ThemeProvider, CardHeader, Typography, Alert } from '@mui/material';
import baseURL from '../../axiosConfig';
import axios from 'axios';


const SettingsPage = () => {
  const [storeOpen, setStoreOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); 
  const [successMessage, setSuccessMessage]= useState('');
  const [errorMessage, setErrorMessage]= useState('');
  const [previousStoreOpen, setPreviousStoreOpen] = useState(storeOpen);

  
  useEffect(() => {
    // Fetch the current store status from the API when the component mounts
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/store/status`);
        const currentStatus = response.data.status; // Assuming the API returns 'open' or 'closed'
        setStoreOpen(currentStatus === 'open');
      } catch (error) {
        console.error('Error fetching store status:', error);
      }
    };

    fetchData();
  }, []);


  useEffect(() => {
    // Clear success and error messages after a delay (e.g., 5000 milliseconds or 5 seconds)
    if (successMessage || errorMessage) {
      const timeoutId = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 2000);

      // Cleanup the timer when the component unmounts or the messages change
      return () => clearTimeout(timeoutId);
    }
  }, [successMessage, errorMessage]);

  const handleToggleStore = async () => {
    const newStoreOpen = !storeOpen;
    setStoreOpen(newStoreOpen);

    try {
      // Make a PUT request to update the order in the API
      await axios.put(`${baseURL}/api/store/status`, { status: newStoreOpen });
      storeOpen ? setSuccessMessage('stored closed successfully'): setSuccessMessage('store opened successfully');
    } catch (error) {
      // Revert the switch back to its previous state
      storeOpen ? setErrorMessage('unable to close store'): setErrorMessage('unable to open store');
      setStoreOpen(previousStoreOpen);
      console.error('Error updating order:', error);
    }
  };
  const theme = createTheme({
    components: {
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: 'rgb(33, 43, 54)', // Change this to your custom color
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              color:'rgb(33, 43, 54)', // Change this to your custom selected text color
            },
          },
        },
      },
    },
  });
  

  return (
    <ThemeProvider theme={theme}>
    <Container sx={{mt:3}}>
        <h6>Settings</h6>
     

      <Card sx={{mt:3, borderRadius:'15px', boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px'}}>
      <Tabs aria-label="custom indicator color tabs" sx={{ px:3, boxShadow: 'rgba(145, 158, 171, 0.08) 0px -2px 0px 0px inset'}} value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab  sx={{
            'span' :{textOverflow: 'clip'},
                textTransform: 'none',
                minWidth: '50px', 
                mr:4,// Adjust the width as needed
                
                py:2,
                px:0,
                
              }} label={<span style={{}}>Store </span>} />
          
        </Tabs>

        <Card sx={{m:3, borderRadius:'15px', maxWidth:300, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px'}}>
           
        <CardContent>
            <label>Toggle Store:</label>
          <div className='d-flex align-items-center mt-3'>
            
            <Switch
              checked={storeOpen}
              onChange={handleToggleStore}
            />
            <span className='ms-3'>Store Status: {storeOpen ? 'Open' : 'Closed'}</span>
          </div>
        </CardContent>
      {errorMessage && <Alert  severity="error"> {errorMessage}</Alert>}
      {successMessage && <Alert  severity="success"> {successMessage}</Alert>}
      </Card>
      </Card>
    </Container>
    </ ThemeProvider>
  );
};

export default SettingsPage;
