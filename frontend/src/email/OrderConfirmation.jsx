import {
    Body,
    Button,
    Column,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Row,
    Section,
    Tailwind,
    Text,
  } from '@react-email/components';
  import * as React from 'react';
  
//   interface OrderConfirmationProps {
//     username?: string;
//     orderId?: string;
//    prdoductImage?: string;
//    productName ?: string;
//    productQuantity?: string;
//    productPrice ?: string;
//   }
  export const OrderConfirmation = ({
    order,
    orderId
    
  }) => {
    const previewText = `Your order of #${orderId} have been placed successfully `;
  
    return (
      <Html>
        <Head />
        <Preview>{previewText}</Preview>
        <Tailwind>
          <Body className="bg-white my-auto mx-auto font-sans text-[#5E5E5E]">
            <Container className=" my-[40px] w-[465px] ">
              <Section className="bg-[#F5F7FB] my-[10px] mx-auto p-[32px] ">
                <Row>
                  <Column>
                  <Img
                  src={`https://www.alminapharmacy.com/static/media/logo.8833247e76213f696009.png`}
                  width="100"
                  height="auto"
                  alt="Almina"
                  className="my-0"
                />
                </Column>
                <Column align='right' className=''>
                <Text className='text-[#B28CFB] m-0'>
                  Order Confirmation
                </Text>
                <Text className='m-0'>
                  Order # <Link>{orderId}
                  </Link>
                </Text>
                </Column>
                </Row>
              </Section>
              <Section className='bg-[#ffff] p-[20px]'>
              <Heading className="text-[#B28CFB] text-center text-[20px] font-bold p-0 my-[30px] mx-0">
                Thanks For Shopping!
              </Heading>
              <Text className='text-[14px] text-center'>
               <span className='text-[#B28CFB] '>Hi <strong>{order.customer.name}</strong>,</span>
               Thank you for shopping with us! Your order is on its way,
  and we're here to keep you healthy and happy.
              </Text>
              </Section>
              <Section className='bg-[#F5F7FB] my-[10px] mx-auto p-[32px] '>
                <Heading className='text-[#B28CFB] text-center text-[20px] font-normal'>
                  Your Order Detail
                </Heading>

                {order.cartItems.map((product, index) => (
                   <Row className='bg-[#fff] rounded-md p-2 mb-3'>
                   <Column className='max-w-[70px]'>
                   <Img 
                   src={`https://almina-shop.onrender.com/api/products/images/${product.image}`} width="70"
                   height="auto"
                   alt="product image"
                   className="my-0 border-md max-w-[70px] w-[fit-content]] flex mx-0" />
                   </Column>
                   <Column className='text-start max-w-[150px] w-[fit-content] flex'>
                   <Text>
                     {product.name}
                   </Text>
                   
                   </Column>
                   <Column className='text-start w-[50px]'>
                   <Text>
                     {product.quantity}
                   </Text>
 
                   </Column>
                   <Column>
                   <Text>
                     AED {product.salePrice?product.salePrice :product.price}
                   </Text>
 
                   </Column>
                 </Row>
                ))}
                 
                 
                
              </Section>
              <Section className="text-center mt-[32px] mb-[10px] p-[20px]">
                <Row className='mb-[50px] ' >
                  <Column className='w-[50%] p-[5px]'>
                  <Text className='mt-[1px] text-[#B28CFB] text-center'>
                  Payment and shipping details
                  </Text>
                  <Row className='mb-1 '>
                    <Column className='text-start  table-cell align-top w-[50%] '>
                    <Text  className='m-0 text-[10px]'>
                      Payment method
                    </Text>
                    </Column>
                    <Column className='text-start table-cell align-top w-[50%]'>
                    <Text className='m-0 text-[10px]'>
                      {order.customer.payment}
                    </Text>
                    </Column>
                  </Row>
                  <Row>
                    <Column className='text-start  table-cell align-top w-[50%]'>
                    <Text className='m-0 text-[10px]'>
                      Address
                    </Text>
                    </Column>
                    <Column className='text-start table-cell align-top w-[50%]'>
                    <Text className='m-0 text-[10px]'>
                    {order.customer.address}
                    </Text>
                    </Column>
                  </Row>
                  </Column>
                  <Column className='bg-[#F5F7FB] rounded-lg p-3 w-[50%]'>
                  <Row className='mb-1'>
                    <Column className='text-start  table-cell align-top w-[70%]'>
                    <Text className='m-0 text-[10px]'>
                      <strong>Subotal</strong>
                    </Text>
                    </Column>
                    <Column className='text-start table-cell align-top w-[30%]'>
                    <Text className='m-0 text-[10px]'>
                      AED {order.customer.totalSalePrice-order.customer.totalVat}
                    </Text>
                    </Column>
                  </Row>
                  <Row className='mb-1'>
                    <Column className='text-start  table-cell align-top w-[70%]'>
                    <Text className='m-0 text-[10px]'>
                      <strong>Vat Amount</strong>
                    </Text>
                    </Column>
                    <Column className='text-start table-cell align-top w-[30%]'>
                    <Text className='m-0 text-[10px]'>
                      {order.customer.totalVat?order.customer.totalVat:0}
                    </Text>
                    </Column>
                  </Row>
                  
                  <Row className='mb-1'>
                    <Column className='text-start  table-cell align-top w-[70%]'>
                    <Text className='m-0 text-[#B28CFB] text-[10px]'>
                      <strong>Total</strong>
                    </Text>
                    </Column>
                    <Column className='text-start table-cell align-top w-[30%]'>
                    <Text className='m-0 text-[#B28CFB] text-[10px]'>
                      AED {order.customer.totalSalePrice}
                    </Text>
                    </Column>
                  </Row>
                  </Column>
                </Row>
                <Hr/>
  <Text className='mt-[30px] text-[#B28CFB] bg-[#F5F7FB] my-[10px] mx-auto p-[32px]'>
  We Hope to see you again.
  </Text>
              </Section>
            </Container>
          </Body>
        </Tailwind>
      </Html>
    );
  };
  
  export default OrderConfirmation;