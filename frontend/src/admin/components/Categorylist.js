import axios from 'axios';
import React, { useEffect, useState } from 'react'
import Categoryupdate from './Categoryupdate';
import { Link } from 'react-router-dom';
import baseURL from '../../axiosConfig';
import { Alert, Avatar, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, Switch, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
function Categorylist({category, onCategoryUpdate}) {
  const [openModal, setOpenModal] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const handleDeleteConfirmationOpen = () => {
    setDeleteConfirmationOpen(true);
  };

  const handleDelete = () => {
    // Call the deleteCategory function or perform the delete action here
    // You can also close the delete confirmation dialog if needed
    setDeleteConfirmationOpen(false);
    deleteCategory();
  };

    const deleteCategory = () => {
        axios
        .delete(`${baseURL}/api/category/${category._id}`)
        .then((res) => {
        })
        .catch((error) => console.log(error));
}

const handleClose =()=>{
  setOpenModal(false)
}
const handleSave =()=>{
  setOpenModal(false)
}

const handleSwitchChange = () => {
  const updatedCategory = { ...category, disabled: !category.disabled };
  axios
    .put(`${baseURL}/api/category/disable/${category._id}`).then((res)=>
    {
      onCategoryUpdate(updatedCategory);
    })
    
    
    .catch((error) => console.log(error));
};
  return (
    <Card sx={{boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px', borderRadius: 3}}>
  <Box sx={{ p: 2, display: 'flex', justifyContent:'space-between' }}>
    <Box sx={{display:'flex', alignItems:'center'}}>
    <Avatar variant="rounded" sx={{p:"3px", mr:'16px',width: 56, height: 56, bgcolor: `rgb(${category.color},0.2)` }}  src={`${baseURL}/api/category/images/${category.image}`} />
    
    <Typography fontWeight="">{category.name} </Typography> 
      </Box> 
      
   
    <IconButton size="small" sx={{width:40 , height:40, }} onClick={()=>{

    setOpenModal(true)
    }}>
      <EditIcon fontSize="small"/>
    </IconButton>
  </Box>
  <Divider />
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="end"
    sx={{ px: 2, py: 1, bgcolor: 'background.default' }}
  >
    </Stack>
 <Box sx={{display:'flex', justifyContent:'space-between', px:2, mb:1 }}>
 <IconButton size="small" sx={{width:40 , height:40, }} onClick={()=>{
  handleDeleteConfirmationOpen();
}}>

 <DeleteIcon sx={{ color: '#e84944' }}/>
 </IconButton>
 <Switch
    checked={!category.disabled}
    onChange={() => handleSwitchChange(category)}
    color="primary"
    name="toggleProduct"
    inputProps={{ 'aria-label': 'toggle product' }}
  />
  
 <Dialog sx={{
    backdropFilter: "blur(3px)",
  }}
  // 👇 Props passed to Paper (modal content)
  PaperProps={{ sx: { borderRadius: "20px", p:1 } }} open={deleteConfirmationOpen} onClose={() => setDeleteConfirmationOpen(false)}>
        <DialogTitle sx={{color: 'black'}}>Delete</DialogTitle>
        <DialogContent>
          <span>
          Are you sure you want to delete the category: {category.name}?
          </span>
            
        </DialogContent>
        <DialogActions>
          <Button sx={{bgcolor: 'rgb(255, 86, 48)', borderRadius: 2, color:"white", ':hover': {
      bgcolor: 'rgb(255, 50, 20)',
      boxShadow: '0px 0px 47px -5px rgba(255,50,20,0.71)',// theme.palette.primary.main
      color: 'white',
    },}} onClick={handleDelete}>
            Delete
          </Button>
          <Button sx={{border: '1px solid', borderRadius: 2, color:"black"}} onClick={() => setDeleteConfirmationOpen(false)} >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
 </Box>


  <Dialog open={openModal} onClose={handleClose}>
      <DialogTitle>Edit Category</DialogTitle>
      <Categoryupdate cat= {category} />
    </Dialog>


</Card>

    // <div>
    //   <tr className="border-bottom border-200 d-flex justify-content-between">
    //                       <td>
    //                         <div className="d-flex align-items-center position-relative">
    //                         <div className="flex-1 ms-3">
    //                             <img src={`${baseURL}/api/category/images/${category.image}`} width="60"alt="" />
                                
    //                           </div>
    //                         <div className="flex-1 ms-3">
    //                             <h6 className="mb-1 fw-semi-bold"><a className="text-dark stretched-link" href="#!">{category.name}</a></h6>
                                
    //                           </div>
    //                         <div className="flex-1 ms-3 rounded-2" style={{width:'30px', height: '30px', backgroundColor: `${category.color}`, opacity:.09}}>
                                
                                
    //                           </div>
    //                         </div>
    //                       </td>
    //                       <td className="align-middle pe-x1">
    //                          <div className="d-flex align-items-center">
                              
    //                          <div className=' d-flex add-to-cart-btn me-2'><button  className="btn  btn-sm text-white d-flex" onClick={deleteCategory}><i className="bi bi-trash fs-5"></i>
    //                   </button></div>

    //                          <div className=' d-flex add-to-cart-btn'><Link to = {`/admindash/categories/update/${category._id}`} className="btn  btn-sm text-white d-flex"  ><i className="bi bi-pen-fill fs-5"></i>
    //                   </Link>
    //                   </div>
    //                         </div> 
    //                       </td>
    //                     </tr>
                       

                       

    // </div>
  )
}

export default Categorylist
