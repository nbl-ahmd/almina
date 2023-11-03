import React from "react";
import { Box, Container, Typography, Grid, Stack, Image } from "@mui/material";

const AboutUsPage = () => {
    
    
  return (
    <Container>
      <div className="mt-5">
        <Typography sx={{fontFamily: 'Poppins, sans-serif', fontSize:'25px', fontWeight:'600', textAlign:'center', color:'#082653'}} className="text-center">About Al Mina Pharmacy</Typography>
        <Typography sx={{fontFamily: 'Poppins, sans-serif', fontSize:'14px', fontWeight:'200', textAlign:'center', paddingInline:'10px', marginTop:'.5rem'}}>Providing Quality Healthcare Products and Services in Ras Al Khaimah</Typography>
      </div>
      <Container sx={{ marginBottom: '10rem', marginTop:'5rem'}}>
      <Grid container spacing={3} sx={{}}>
      <Grid item md={10}>
      <Box className="mt-4 mb-5" sx={{fontFamily: 'Poppins, sans-serif', lineHeight:2, fontSize:'14px', fontWeight:'400', textAlign:'left', color:'#747579'}}>
        <span className="mb-3 d-flex">Al Mina Pharmacy is a leading pharmacy in Ras Al Khaimah, UAE, with four convenient locations across the city. We offer a wide range of healthcare products and services, including prescription medications, over-the-counter medications, health and beauty products, and medical supplies. We also offer free delivery across Ras Al Khaimah.</span>

        <span>Our team of experienced and knowledgeable pharmacists are dedicated to providing our customers with the highest quality healthcare services. We are always here to answer your questions and help you find the right products for your needs.</span>
      </Box>
      </Grid>
      </Grid>
      </Container>
      {/* <div className="about-us-images">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <img src="https://source.unsplash.com/random/800x800/" alt="Pharmacist helping customer" />
          </Grid>
          <Grid item xs={12} md={6}>
            <img src="https://example.com/pharmacy-img-2.jpg" alt="Group of pharmacists working together" />
          </Grid>
          <Grid item xs={12} md={6}>
            <img src="https://example.com/pharmacy-img-3.jpg" alt="Well-stocked pharmacy shelf" />
          </Grid>
          <Grid item xs={12} md={6}>
            <img src="https://example.com/pharmacy-img-4.jpg" alt="Customer picking up medication" />
          </Grid>
          <Grid item xs={12} md={6}>
            <img src="https://example.com/pharmacy-img-5.jpg" alt="Customer receiving vaccination" />
          </Grid>
        </Grid>
      </div> */}
    </Container>
  );
};

export default AboutUsPage;
