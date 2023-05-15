import React from 'react';
import  Card  from '@mui/material/Card';
import  CardContent  from '@mui/material/CardContent';
import  Typography  from '@mui/material/Typography';
import  Button  from '@mui/material/Button';

const ProductCard = ({ product }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          "Product Name"
        </Typography>
        <Typography variant="body1">
          "CAtegory"
        </Typography>
        <Typography variant="body2">
          $price
        </Typography>
        <Button variant="outlined" color="primary">
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
