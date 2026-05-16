const express = require('express');
const path = require('path');
const router = express.Router();

// Login page
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

// Dashboard (admin/user)
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

// Admin dashboard (alias)
router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

// API Documentation
router.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'api-docs.html'));
});

// Landing page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'landing.html'));
});

module.exports = router;
