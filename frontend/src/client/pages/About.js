import React from 'react';
import { Container, Typography, Grid, Card, CardContent, CardMedia } from '@mui/material';

const AboutPage = () => {
  return (
    <Container maxWidth="lg">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Your Trusted Pharmacy in Ras Al Khaimah, UAE
          </Typography>
          <Typography variant="h6" align="center" color="textSecondary" paragraph>
            Empowering Health, One Prescription at a Time
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom>
            Our Story
          </Typography>
          <Typography variant="body1" paragraph>
            Welcome to Al Mina Pharmacy, your dedicated partner in health and wellness. Located in the beautiful city of Ras Al Khaimah, UAE, we have been committed to serving the community with top-notch pharmaceutical care for over a decade.
          </Typography>
          <Typography variant="body1" paragraph>
            Our mission is simple: to empower your health, one prescription at a time. We understand that your well-being is of utmost importance, and we're here to ensure that you receive the best healthcare solutions, advice, and support.
          </Typography>
          <Typography variant="body1" paragraph>
            With a network of four conveniently situated stores across Ras Al Khaimah, we are just around the corner, ready to meet your healthcare needs. Whether it's medications, medical supplies, or a friendly consultation with our experienced pharmacists, we have you covered.
          </Typography>
          <Typography variant="body1" paragraph>
            In addition to our in-store services, we offer free and efficient delivery services across Ras Al Khaimah. We want to make sure you have easy access to your prescriptions and healthcare products, no matter where you are in the city.
          </Typography>
          <Typography variant="body1" paragraph>
            Thank you for choosing Al Mina Pharmacy as your healthcare partner. Your trust and health are our top priorities. We look forward to serving you and being a part of your health journey.
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardMedia
              component="img"
              alt="Pharmacy Store"
              height="250"
              image="/store-image.jpg"
            />
            <CardContent>
              <Typography variant="h6" component="div">
                Our Modern Pharmacy Stores
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Visit one of our four conveniently located stores in Ras Al Khaimah.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AboutPage;
