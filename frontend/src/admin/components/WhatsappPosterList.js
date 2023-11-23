import axios from 'axios';
import React from 'react'
import baseURL from '../../axiosConfig';
import { Box, Button, Typography } from '@mui/material';

export default function WhatsappPosterList({banners}) {

    const deleteBanner = () => {
        axios
        .delete(`${baseURL}/api/whatsapp/image/${banners._id}`)
        .then((res) => {
        })
        .catch((error) => console.log(error));
}
const copyToClipboard = () => {
    navigator.clipboard.writeText(`${baseURL}/api/whatsapp/image/${banners.image}`)
      .then(() => {
        console.log('Text copied to clipboard!');
      })
      .catch((err) => {
        console.error('Unable to copy text to clipboard', err);
      });
  };

  return (
    <div>


<Box sx={{ alignItems:"center"}}>
<img className="rounded-1" src={`${baseURL}/api/whatsapp/image/${banners.image}`} width="100%" alt="" />
<Typography sx={{mt:1, px:1, overflowWrap: "break-word", fontFamily: "Poppins, sans-serif", fontWeight:200, fontSize:"12px"}}>{`${baseURL}/api/whatsapp/image/${banners.image}`}</Typography>
<Box sx={{display: "flex", justifyContent:"space-between", px:1}}>
    
    <Button onClick={copyToClipboard}>
        copy
    </Button>
    <Button 
    onClick={deleteBanner}>
    Delete
    </Button>
</Box>

</Box>

    </div>
  )
}
