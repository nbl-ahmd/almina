import axios from 'axios';
import React, { useEffect, useState } from 'react';
import baseURL from '../../axiosConfig';
import { AppBar, Avatar, Box, Button, Container, Grid, IconButton, InputBase, Stack, TextField, Toolbar, Typography } from '@mui/material';
import WhatsapChatCard from '../components/WhatsapChatCard';
import SendIcon from '@mui/icons-material/Send';
import io from 'socket.io-client';
const socket = io.connect(baseURL);

const WhatsappMessaging = () => {

  const [recipient, setRecipient] = useState();
  // Define your contact list
  const contactList = ['+918943628330', '971529211450', '+971507356412'];
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    // Your existing logic to fetch recipients
    socket.on('newMessage', (conversation) => {
      setRecipients((prevRecipients) => [...prevRecipients, conversation]);
    });
    // Socket.io event listener for new messages
    socket.on('newMessage', (message) => {
      if (selectedRecipient && message.recipient.from === selectedRecipient) {
        setMessages((prevMessages) => [...prevMessages, message.content]);
      }
    });

    return () => {
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
    for (const recipient of contactList) {
        console.log(recipient);
      try {
        axios.post(`${baseURL}/api/whatsapp/s`, recipient)
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
  };
  const sendChatMessage = async (recipient, message) => {
    
      try {
        setText('');
        // axios.post(`${baseURL}/api/whatsapp/text`, recipient, message)
        // .then(response => {
        //     console.log(response.data);
        //   })
        //   .catch(error => {
        //     console.log(error);
        //   });

        // You can add additional logic here based on the response if needed

      } catch (error) {
        console.error(error);
      }
  };

  return (
    <>
    <div>
     <Button onClick={()=>{

            sendMessages();
          
     }}>
        Send
     </Button>
    </div>
    <Container>
    <Grid container spacing={2}>
  <Grid item xs={4}>

    <Box sx={{background: '#fffd', borderRadius: 2, flexGrow: 1, minHeight:650, overflow: 'hidden', px: 3, py:5}}>
    {recipients.map((recipient, index) => (
    <Box
        sx={{
          my: 1,
          mx: 'auto',
          p: 1,
          background: "rgba(128, 227, 208, 0.154)",
          borderRadius: 2,
        }}
        onClick={() => setSelectedRecipient(recipient.from)}
      >
        <Stack spacing={2} direction="row" alignItems="center">
        <Avatar><i className="ri-user-line"></i></Avatar>
          <Box>
          <Typography noWrap>{recipient.name}</Typography>
          <Typography noWrap>{recipient.from}</Typography>
          </Box>
        </Stack>
      </Box>
    ))}
    </Box>
  </Grid>
  <Grid item xs={8}>

  {selectedRecipient ?
  <Box sx={{position:"relative",  width: "100%", background: '#fff', borderRadius: 2, flexGrow: 1, minHeight:650, overflow: 'hidden', boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", }}>
  <AppBar position="static" sx={{px:4, py:1, background: 'rgba(128, 227, 208, 0.154)',boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", }}>
  <Stack spacing={5} direction="row" alignItems="center">
          <Avatar><i className="ri-user-line"></i></Avatar>
          <Box>
          <Typography noWrap>{selectedRecipient.name}</Typography>
          <Typography noWrap>{selectedRecipient.from}</Typography>
          </Box>
        </Stack>
</AppBar>

    <Box sx={{ p:3, display: "flex", flexDirection:"column"}}>
    {messages.map((message, index) => (
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
          sendChatMessage(selectedRecipient, text);
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
  
</Grid>
    </Container>
    
    
    
    
    </>
  );
};

export default WhatsappMessaging;
