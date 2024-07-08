require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

console.log('Environment variables:', {
  SMTP_HOST: process.env.SMTP_HOST ? 'Set' : 'Not set',
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
  FROM_EMAIL: process.env.FROM_EMAIL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite'
});

const Conversation = sequelize.define('Conversation', {
  userId: DataTypes.STRING,
  messages: DataTypes.TEXT
});

sequelize.sync();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendBookingConfirmationEmail(booking) {
  const msg = {
    from: process.env.FROM_EMAIL,
    to: booking.email,
    subject: 'Booking Confirmation',
    text: `Dear ${booking.fullName},

Thank you for booking a room at our hotel. Here are your booking details:

Room ID: ${booking.roomId}
Number of nights: ${booking.nights}
Booking ID: ${booking.id}

We look forward to welcoming you!

Best regards,
Hotel Booking Team`
  };

  try {
    console.log('Attempting to send email to:', booking.email);
    const info = await transporter.sendMail(msg);
    console.log('Email sent successfully. MessageId:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

function formatResponse(response) {
  if (!response.includes('##') && !response.includes('•')) {
    const lines = response.split('\n');
    let formattedLines = [];
    let inList = false;
    let listItemCount = 0;

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('- ')) {
        listItemCount++;
        if (!inList) {
          if (listItemCount > 1) {
            formattedLines.push(''); // Add a newline before the list
            inList = true;
          }
        }
        if (inList) {
          formattedLines.push(`• ${line.slice(2)}`);
        } else {
          formattedLines.push(line);
        }
      } else if (line) {
        if (inList) {
          formattedLines.push(''); // Add a newline after the list
          inList = false;
          listItemCount = 0;
        }
        if (line.length <= 50 && !line.endsWith('.')) {
          formattedLines.push(`## ${line}`);
        } else {
          formattedLines.push(line);
        }
      } else {
        formattedLines.push(line); // Preserve empty lines
      }
    }
    return formattedLines.join('\n').trim();
  }
  return response;
}

app.post('/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    let conversation = await Conversation.findOne({ where: { userId } });
    if (!conversation) {
      conversation = await Conversation.create({ userId, messages: '[]' });
    }
    
    let messages = JSON.parse(conversation.messages);
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant for hotel bookings." },
        ...messages
      ],
      functions: [
        {
          name: "get_room_options",
          description: "Get available room options",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        },
        {
          name: "book_room",
          description: "Book a room",
          parameters: {
            type: "object",
            properties: {
              roomId: { type: "integer" },
              fullName: { type: "string" },
              email: { type: "string" },
              nights: { type: "integer" }
            },
            required: ["roomId", "fullName", "email", "nights"]
          }
        }
      ],
      function_call: "auto"
    });

    const assistantMessage = completion.choices[0].message;

    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);

      let functionResult;
      if (functionName === 'get_room_options') {
        functionResult = await getRoomOptions();
      } else if (functionName === 'book_room') {
        try {
          functionResult = await bookRoom(functionArgs);
          const emailSent = await sendBookingConfirmationEmail(functionResult);
          console.log('Email sending result:', emailSent);
          functionResult = { ...functionResult, emailSent };
        } catch (error) {
          console.error('Error in booking process:', error);
          functionResult = { error: 'An error occurred during the booking process.' };
        }
      }

      messages.push(assistantMessage);
      messages.push({
        role: "function",
        name: functionName,
        content: JSON.stringify(functionResult)
      });

      const systemPrompt = `
You are Neko, a helpful hotel booking assistant for LuxeStay's. Your role is to assist users in booking rooms at our resort. Follow these guidelines:

1. 🎨 Formatting:
   • Use proper indentation for clarity
   • Utilize headings with emojis for different sections
   • Employ bullet points for lists and options

2. 🗣️ Communication Style:
   • Be friendly, professional, and use emojis to engage users
   • Provide clear, concise responses
   • Switch to the user's preferred language if requested

3. 🏨 Booking Process:
   • Use 'get_room_options' function to display available rooms when asked
   • Help users choose a room and specify the number of nights
   • Use 'book_room' function to finalize bookings with user-provided details
   • Confirm booking details before proceeding
   • Inform users that a confirmation email will be sent after booking
   • Provide a formatted booking confirmation immediately after completion

4. 🚫 Restrictions:
   • Do not expose function names or technical details to users
   • Your owner's name is Harsh Verma, but only mention this if directly asked

5. 📝 Booking Confirmation:
   • When the user provides their full name and email, immediately make a 'book_room' function call
   • Present the booking confirmation in a clear, formatted manner

Remember, your main goal is to help users book rooms efficiently and pleasantly. Always structure your responses for easy understanding, using appropriate formatting techniques.
      `;

      const secondCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt},
          ...messages
        ]
      });

      messages.push(secondCompletion.choices[0].message);
    } else {
      messages.push(assistantMessage);
    }

    await conversation.update({ messages: JSON.stringify(messages) });

    const aiResponse = messages[messages.length - 1].content;
    const formattedResponse = formatResponse(aiResponse);
    res.json({ response: formattedResponse });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

async function getRoomOptions() {
  try {
    const response = await fetch('https://bot9assignement.deno.dev/rooms');
    return await response.json();
  } catch (error) {
    console.error('Error getting room options:', error);
    throw error;
  }
}

async function bookRoom(args) {
  try {
    const response = await fetch('https://bot9assignement.deno.dev/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    const bookingResult = await response.json();
    
    return {
      email: args.email,
      fullName: args.fullName,
      roomId: bookingResult.roomId || args.roomId,
      nights: args.nights,
      id: bookingResult.id || `BOOKING-${Date.now()}`
    };
  } catch (error) {
    console.error('Error booking room:', error);
    throw error;
  }
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/test-email', async (req, res) => {
  try {
    await sendBookingConfirmationEmail({
      email: 'test@example.com',
      fullName: 'Test User',
      roomId: 123,
      nights: 2,
      id: 'TEST123'
    });
    res.send('Test email sent successfully');
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).send('Error sending test email');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});