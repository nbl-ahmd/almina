import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Categorylist from './Categorylist';
import baseURL from '../../axiosConfig';
import { Tab, Tabs, Grid, Card, CardHeader, CardContent, Chip, ThemeProvider, createTheme, Box, Container } from '@mui/material';
import{Modal} from 'react-bootstrap';


const CategoryUpload = () => {
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [message, setMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 for "All Categories", 1 for "Disabled Categories"
  const onNameChange = (e) => setName(e.target.value);
  const onImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
  };

  const [category, setCategory] = useState([]);

  useEffect(() => {
    axios
      .get(`${baseURL}/api/category`)
      .then((response) => {
        console.log(response.data);
        setCategory(response.data);
      })
      .catch((error) => console.log(error));
  }, []);

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleCategoryUpdate = (updatedCategory) => {
    // Update the 'categories' state with the updated category
    setCategory((prevCategories) =>
      prevCategories.map((category) =>
        category._id === updatedCategory._id ? updatedCategory : category
      )
    );
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', image);

    axios
      .post(`${baseURL}/api/category`, formData)
      .then((response) => {
        console.log(response.data);
        setMessage('Category created successfully');
      })
      .catch((error) => {
        console.log(error);
        setMessage('Error: Category was not created');
      });
  };

  const allCategories = category.filter((c) => !c.disabled);
  const disabledCategories = category.filter((c) => c.disabled);
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
    <>
    <ThemeProvider theme={theme}>
    <Container sx={{mt:4}}>
        <h6 className="ps-3"> Categories</h6>
        <Card sx={{paddingBottom: 5, mt:5, borderRadius:5, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px'}}>
        <Tabs 
        
        aria-label="custom indicator color tabs" sx={{ px:3, boxShadow: 'rgba(145, 158, 171, 0.08) 0px -2px 0px 0px inset'}} value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab  sx={{
            'span' :{textOverflow: 'clip', p:0},
                textTransform: 'none',
                minWidth: '50px', 
                mr:4,// Adjust the width as needed
                
                py:2,
                px:0,
                
              }} label={<span style={{}}>Active 
              <Chip sx={{width:30, height:30, borderRadius:'5px', backgroundColor: 'rgb(33, 43, 54)', color:'#fff', ml:1,}} label={allCategories.length} /></span>} />
          <Tab sx={{textTransform :"none", minWidth: '50px', py:2,
                px:0,}} label={<span style={{}}>Disabled<Chip sx={{'span' :{textOverflow: 'clip', p:0}, width:30, height:30,  borderRadius:'5px', backgroundColor: 'rgb(255, 171, 0)',  ml:1}} label={disabledCategories.length} /></span>} />
        </Tabs>
       
       

       <CardContent sx={{p:2}}>
       {( activeTab === 1  && disabledCategories.length ===0 && <div className='d-flex justify-content-center p-5 mb-3'><span>no disabled categories</span></div>)}
     {( activeTab === 0  && allCategories.length ===0 && <div className='d-flex justify-content-center p-5 mb-3'><span>no active categories</span></div>)}
       <Grid container spacing={4}>
     
          {(activeTab === 0 ? allCategories : disabledCategories).map((category) => (
            <Grid item xs={12} sm={6} md={4} key={category._id}>
              <Categorylist category={category} onCategoryUpdate={handleCategoryUpdate} />
            </Grid>
          ))}
        </Grid>
       </CardContent>
        </Card>
      </Container>
    </ThemeProvider>
      

      <Modal centered show={showEditModal} fullscreen={false} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <h6 className="ms-4 mb-0">Add new category</h6>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="container">
            <form onSubmit={onSubmit} className="form mt-2" encType="multipart/form-data">
              <div className="form-holder">
                <input
                  type="text"
                  className="form-control mb-3"
                  id="categoryUpload"
                  placeholder="category"
                  value={name}
                  onChange={onNameChange}
                />

                <input type="file" className="form-control " id="categoryUpload" placeholder="category" onChange={onImageChange} />
              </div>
              <div className="form-group">
                <button className="btn btn-primary mt-2 float-end mt-4" type="submit">
                  Upload
                </button>
              </div>
            </form>
            <p>{message}</p>
          </div>
        </Modal.Body>
      </Modal>

      <button className="d-flex add-category-btn" onClick={() => handleEditClick()}>
        +
      </button>
    </>
  );
};

export default CategoryUpload;
