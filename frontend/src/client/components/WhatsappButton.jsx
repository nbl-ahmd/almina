import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {

  // WhatsApp message setup
  const phoneNumber = "+971504825007"; // Add country code without +
  const message = encodeURIComponent("Hello Al Mina Pharmacy! I'd like to inquire about your products.");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;



  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`whatsapp-button visible`}
    >
      <i className="fa-brands fa-whatsapp"></i>
    </a>
  );
};

export default WhatsAppButton;