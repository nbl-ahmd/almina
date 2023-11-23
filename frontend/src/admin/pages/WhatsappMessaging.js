import axios from 'axios';
import React, { useEffect, useState } from 'react';
import baseURL from '../../axiosConfig';
import { AppBar, Avatar, Box, Button, Chip, Container, Grid, IconButton, InputBase, Stack, Tab, Tabs, TextField, ThemeProvider, Toolbar, Typography, createTheme } from '@mui/material';
import WhatsapChatCard from '../components/WhatsapChatCard';
import SendIcon from '@mui/icons-material/Send';
import io from 'socket.io-client';
import Papa from 'papaparse'; // You may need to install the papaparse library
import WhatsapPoster from '../components/WhatsapPoster';
import WhatsappPosterList from '../components/WhatsappPosterList';

const socket = io.connect(baseURL);

const WhatsappMessaging = () => {

  const [recipient, setRecipient] = useState();
  // Define your contact list
  const contactList = ['+918943628330', '971529211450', '+971507356412'];
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [selectedRecipientName, setSelectedRecipientName] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [template, setTemplate] = useState('');
  const [link, setLink] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const [phoneNumbers, setPhoneNumbers] = useState([]);


  const [banners, setBanners] = useState([]);

  useEffect(() => {
    axios.get(`${baseURL}/api/whatsapp/image`)
      .then(response => {
        console.log(response.data);
        setBanners(response.data);
      })
      .catch(error => console.log(error));
  }, []);


 const [name, setName] = useState('');
 const [image, setImage] = useState(null);
 const [message, setMessage] = useState('');

 const handleImageChange = event => setImage(event.target.files[0]);

 const handleSubmit = event => {
   event.preventDefault();
   const formData = new FormData();
   formData.append('image', image);
   axios.post(`${baseURL}/api/whatsapp/image`, formData)
     .then(response => {
       console.log(response.data);
       setMessage('Banner created successfully');
     })
     .catch(error => {
       console.log(error);
       setMessage('Error creating banner');
     });
 };






  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      // Use PapaParse to parse the CSV file
      Papa.parse(file, {
        complete: (result) => {
          // Extract phone numbers from the parsed CSV data
          const numbers = result.data.map((row) => row[0]).filter(Boolean);
          setPhoneNumbers(numbers);
        },
        header: false,
      });
    }
  };

  useEffect(() => {
    // Your existing logic to fetch recipients
    socket.on('newPoster', (poster) => {

    setBanners((prevBanners) => [...prevBanners, poster]);
    console.log(poster);

    });



    socket.on('newMessage', (conversation) => {

      const recipientExists = recipients.some((recipient) => recipient?.from === conversation.recipient);

      // Alternatively, you can use optional chaining to handle potential undefined values:
      // const recipientExists = recipients.some((recipient) => recipient?.from === conversation.recipient);
      
console.log(recipient);   
  // If the recipient doesn't exist, add it to the state
  if (!recipientExists) {
    setRecipients((prevRecipients) => [...prevRecipients, conversation.recipient]);
  }
      console.log(conversation);
    });
    // Socket.io event listener for new messages
    socket.on('newMessage', (message) => {
      if (selectedRecipient && message.recipient === selectedRecipient) {
        setMessages((prevMessages) => [...prevMessages, message.message]);
        
        console.log(message.message.content);
      }
    });

    return () => {
      socket.off('newPoster');
      socket.off('newMessage');
    };
  }, [selectedRecipient,recipients]);

  useEffect(() => {
    // Fetch all recipients when the component mounts
    const fetchRecipients = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/whatsapp/recipients`);
        setRecipients(response.data);
      } catch (error) {
        console.error('Error fetching recipients:', error);
      }
    };

    fetchRecipients();
  }, []);

  useEffect(() => {
    // Fetch messages when a recipient is selected
    const fetchMessages = async () => {
      if (selectedRecipient) {
        try {
          const response = await axios.get(`${baseURL}/api/whatsapp/messages/${selectedRecipient}`);
          setMessages(response.data.messages);
          console.log(response.data.messages);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      }
    };

    fetchMessages();
  }, [selectedRecipient]);

  const sendMessages = async () => {
    for (const recipient of phoneNumbers) {
        console.log(recipient);
      try {
        axios.post(`${baseURL}/api/whatsapp/s`, {
          recipient: recipient,
          template: template,
          link: link
        })
        .then(response => {
            console.log(response.data);
          })
          .catch(error => {
            console.log(error);
          });

        // You can add additional logic here based on the response if needed

      } catch (error) {
        console.error(error);
      }
    }

    console.log(template);
    console.log(link);
  };
  const sendChatMessage = async (recipient, name, message) => {
    
      try {
        console.log(recipient,name, message);
        axios.post(`${baseURL}/api/whatsapp/text`, {
          recipient: recipient,
          text: message,
        })
        .then(response => {
            console.log(response.data);
          })
          .catch(error => {
            console.log(error);
          });
          setText('');
        // You can add additional logic here based on the response if needed

      } catch (error) {
        console.error(error);
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
    <>
  
    <Container sx={{mt:4}}>
    <Grid container spacing={2}>
  <Grid item xs={4}>
  <ThemeProvider theme={theme}>
    <Box sx={{background: '#fffd', borderRadius: 2, flexGrow: 1, height:650, overflow: 'hidden', py:1}}>

    <Tabs 
        
        aria-label="custom indicator color tabs" sx={{ boxShadow: 'rgba(145, 158, 171, 0.08) 0px -2px 0px 0px inset'}} value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab  sx={{
            'span' :{textOverflow: 'clip', p:0},
                textTransform: 'none',
                minWidth: '50px', 
                mr:4,// Adjust the width as needed
                
            
                px:0,
                
              }} label={<span style={{}}>Chat</span>} />
          <Tab sx={{textTransform :"none", minWidth: '50px', py:2,
                px:0,}} label={<span style={{}}>Broadcast</span>} />
        </Tabs>

     <Box sx={{height:600, px:3, py:3, overflowY: "auto"}}>
     {activeTab === 0 ?
    recipients.map((recipient, index) => (
    <Box
        sx={{
          my: 1,
          mx: 'auto',
          p: 1,
          background: "rgba(128, 227, 208, 0.154)",
          borderRadius: 2,
          cursor: 'pointer'
        }}
        onClick={() =>
           {
            setSelectedRecipient(recipient?.from);
           setSelectedRecipientName(recipient?.name)
           }}
      >
        <Stack spacing={2} direction="row" alignItems="center">
        <Avatar><i className="ri-user-line"></i></Avatar>
          <Box>
          <Typography noWrap>{recipient?.name}</Typography>
          <Typography noWrap>{recipient?.from}</Typography>
          </Box>
        </Stack>
      </Box>
    )) 
    : <div>
      
    <div>
      <ul>
        {phoneNumbers.map((number, index) => (

<Box
sx={{
  my: 1,
  mx: 'auto',
  p: 1,
  background: "rgba(128, 227, 208, 0.154)",
  borderRadius: 2,
  cursor: 'pointer'
}}
onClick={() =>
   {
    setSelectedRecipient(recipient.from);
   setSelectedRecipientName(recipient.name)
   }}
>
<Stack spacing={2} direction="row" alignItems="center">
<Avatar><i className="ri-user-line"></i></Avatar>
  <Box>
  <Typography noWrap key={index}>{number}</Typography>
  </Box>
</Stack>
</Box>
        ))}
      </ul>
    </div>
  </div>
    }
     </Box>
    </Box>
    </ThemeProvider>
  </Grid>
  {activeTab === 0 ?
  <Grid item xs={8}>

  {selectedRecipient ?
  <Box sx={{position:"relative",  width: "100%", background: '#fff', borderRadius: 2, flexGrow: 1, height:650, overflow: 'hidden', boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", }}>
  <AppBar position="static" sx={{px:4, py:1, background: 'rgba(128, 227, 208, 0.154)',boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", }}>
  <Stack spacing={5} direction="row" alignItems="center">
          <Avatar><i className="ri-user-line"></i></Avatar>
          <Box>
          <Typography noWrap>{selectedRecipientName}</Typography>
          <Typography noWrap>{selectedRecipient}</Typography>
          </Box>
        </Stack>
</AppBar>

    <Box sx={{p:3, display: "flex", flexDirection:"column-reverse", mb:4, maxHeight:490, overflowY: "auto"}}>
    {messages.slice().reverse().map((message, index) => (
                <WhatsapChatCard key={index} content={message.content} sender={message.sender} />
              ))}
    </Box>

    <Box sx={{position:"absolute", bottom:0, width:"100%", background: "#ffff"}}>
      <Box sx={{mx:3, mb:3, px: 2, py:2, borderRadius:2, boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", flexGrow:1, display: 'flex',}}>

      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder="Message the customer"
        inputProps={{ 'aria-label': 'Message the customer' }}
        onChange={(e) => setText(e.target.value)}
        value={text}
      />
       <IconButton type="button" sx={{ p: '10px' }} aria-label="search" onClick={
        ()=>{
          sendChatMessage(selectedRecipient, selectedRecipientName, text);
        }
       }>
        <SendIcon />
      </IconButton>
      </Box>
    </Box>
    </Box > : 
    <Box sx={{position:"relative",  width: "100%", background: '#fff', borderRadius: 2, flexGrow: 1, minHeight:650, overflow: 'hidden', boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", display:"flex", justifyContent:"center", alignItems:"center" }}>
<p>select any customer to start a conversation</p>
    </Box>
    }
  </Grid>
  :
  <Grid item xs={8}>
    <Box sx={{position:"relative",  width: "100%", background: '#fff', borderRadius: 2, flexGrow: 1, height:650, overflow: 'auto', boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", }}>
    <AppBar position="static" sx={{px:4, py:1, background: 'rgba(128, 227, 208, 0.154)',boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", }}>
  <Stack spacing={5} direction="row" alignItems="center">
          <Avatar><i className="ri-user-line"></i></Avatar>
          <Box>
          <Typography noWrap>Broadcast Message</Typography>
          </Box>
        </Stack>
</AppBar>

<Box sx={{px:3, py:2, display: "flex", justifyContent:"space-around"}}>
{/* <input type="file" accept=".csv" onChange={handleFileChange} /> */}
<Box sx={{p:3, width:200, height:250, boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", borderRadius:2 , display:"flex",textAlign:'center', flexDirection:"column", alignItems:"center", justifyContent:"space-between"}}>
  <Box>
  <h5>Upload csv file</h5>
  <Typography sx={{mt:2, lineHeight:1.3, fontWeight:300, fontSize:13, color: '#cedcd', textAlign:'center', fontFamily: 'Poppins, sans-serif'}}>Please select and upload a csv file of the numbers to send the broadcast</Typography>
  </Box>
<Box>
<input
  accept=".csv"
  style={{ display: 'none' }}
  id="raised-button-file"
  multiple
  type="file"
  onChange={handleFileChange}
/>
<label htmlFor="raised-button-file">
  <Button variant="raised" component="span" sx={{backgroundColor: 'rgb(255, 171, 0)',}} >
    Upload
  </Button>
</label> 
</Box>
</Box>

<Box sx={{p:2, width:200, height:250, boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", borderRadius:2 , display:"flex",textAlign:'center', flexDirection:"column", alignItems:"center", justifyContent:"space-between"}}>
  <Box>
  <h5>Upload Image</h5>
  <Typography sx={{mt:2, lineHeight:1.3, fontWeight:300, fontSize:13, color: '#cedcd', textAlign:'center', fontFamily: 'Poppins, sans-serif'}}>Please select and upload an image to send with the broadcast</Typography>
  </Box>
<Box>
<div className="">
      <form className='' onSubmit={handleSubmit}>
       
        <div className='mb-2'>
          <input className='form-control' type="file" id="image" onChange={handleImageChange} />
        </div>
        <button className='btn btn-p' type="submit">Upload</button>
      </form>
      <p>{message}</p>
  </div>
</Box>
</Box>

<Box sx={{p:3, width:200, height:250, boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", borderRadius:2 , display:"flex",textAlign:'center', flexDirection:"column", alignItems:"center", justifyContent:"space-between"}}>
  <Box>
  <Typography sx={{mb:3, lineHeight:1.3, fontWeight:300, fontSize:13, color: '#cedcd', textAlign:'center', fontFamily: 'Poppins, sans-serif'}}> Enter template name and link and click send</Typography>
  </Box>
<Box>

<TextField
          label="Template"
          id="outlined-size-small"
          defaultValue="Small"
          size="small"
          InputProps={{
            style: {
              fontSize: 14,
              fontFamily: 'Poppins, sans-serif', 
              color:"#566a7f",
            },
          }}
          InputLabelProps={{
            sx: {
              fontSize: 13,
              fontFamily: 'Poppins, sans-serif', 
              color:"#566a7f",
              fontWeight: 200
            },
          }}

          value={template}
          onChange={(e)=>{
            setTemplate(e.target.value);
          }}
          sx={{mb:2}}
        />

<TextField
          label="Link"
          id="outlined-size-small"
          defaultValue="Small"
          size="small"
          InputProps={{
            style: {
              fontSize: 14,
              fontFamily: 'Poppins, sans-serif', 
              color:"#566a7f",
              fontWeight:200
            },
          }}
          InputLabelProps={{
            sx: {
              fontSize: 13,
              fontFamily: 'Poppins, sans-serif', 
              color:"#566a7f",
              fontWeight: 200
            },
          }}

          value={link}
          onChange={(e)=>{
            setLink(e.target.value);
          }}
          sx={{mb:2}}
        />

<Button sx={{backgroundColor: 'rgba(128, 227, 208, 0.5)', color: "#566a7f"}}
onClick={()=>{
sendMessages();
}}>
Send
</Button>
</Box>
</Box>
    </Box>
    

    
  
    <Box sx={{px:5, display: "flex", mb:3, justifyContent:"space-around"}}>
    <Grid container spacing={2}>
    {banners.map(banners => (
      <Grid item xs={3}>
  <WhatsappPosterList key={banners._id} banners={banners} />
  </Grid>
))}
</Grid>
    </Box>
    
    </Box>

   
   </Grid> 
    }
   
</Grid>
    </Container>
    
    
    
    
    </>
  );
};

export default WhatsappMessaging;
