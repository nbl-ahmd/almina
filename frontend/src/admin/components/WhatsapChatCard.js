import { Box } from '@mui/material'
import React from 'react'

const WhatsapChatCard = (content, sender) => {
  return (
    <Box sx={{boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px,rgba(145, 158, 171, 0.12) 0px 12px 24px -4px", px:2, py:1, borderRadius:2, display: "flex", float:"right"}}>
        {content}
    </Box>
  )
}

export default WhatsapChatCard
