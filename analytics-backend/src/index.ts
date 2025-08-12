#!/usr/bin/env node

import dotenv from 'dotenv';
import { startServer } from './app';

// Load environment variables
dotenv.config();

// Get port from environment
const PORT = parseInt(process.env.PORT || '3001', 10);

// Start the server
startServer(PORT)
  .then(() => {
    console.log(`✅ Expendi Analytics Backend started successfully on port ${PORT}`);
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });