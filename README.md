# StellarStay Concierge Chatbot

Welcome to the StellarStay Concierge Chatbot project. This application is designed to assist users with hotel bookings and provide information about available rooms and amenities. The chatbot leverages OpenAI's API for natural language understanding and interaction, and it integrates email functionality to send booking confirmations.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Installation Steps](#installation-steps)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the Application](#running-the-application)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [License](#license)

## Features
- Interactive chatbot for hotel bookings.
- Room availability and booking process assistance.
- Email confirmation for bookings.
- Responsive front-end interface.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** SQLite (using Sequelize ORM)
- **Frontend:** HTML, CSS, JavaScript
- **APIs:** OpenAI API, Nodemailer for email

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- SQLite

### Installation Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/stellarstay-concierge.git
   cd stellarstay-concierge

2. **Install dependencies:**
       npm install
   
3.  **Set up environment variables: Create a .env file in the root directory and add the following variables:**
      SMTP_HOST=smtp.example.com
      SMTP_PORT=587
      SMTP_SECURE=false
      SMTP_USER=your-email@example.com
      SMTP_PASS=your-email-password
      FROM_EMAIL=your-email@example.com
      OPENAI_API_KEY=your-openai-api-key
      PORT=3000

4.  **Initialize the database**
      npx sequelize-cli db:migrate


**Environment Variables**
    The application requires the following environment variables:

    SMTP_HOST: Hostname for the SMTP server.
    SMTP_PORT: Port number for the SMTP server.
    SMTP_SECURE: Whether the connection to the SMTP server is secure (true or false).
    SMTP_USER: SMTP server username.
    SMTP_PASS: SMTP server password.
    FROM_EMAIL: Email address to send booking confirmations from.
    OPENAI_API_KEY: API key for OpenAI.
    PORT: Port number for the Express server.

    
**Database**
      The application uses SQLite with Sequelize ORM. A Conversation model is defined to store user conversations.


**Running the Application**
    Start the server: npm start


**Open your browser and navigate to http://localhost:3000.**<br>

**Usage**<br>
  ***Interact with the chatbot:***<br>
    Open the web interface.<br>
    Type your query into the chat input and press enter.<br>
    The chatbot will respond with information or assist you with booking a room.<br>
  ***Booking a room:***<br>
    Provide details like room type, number of nights, and personal information.<br>
    Receive a booking confirmation via email.
        
