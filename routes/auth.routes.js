const express = require('express');
const router = express.Router();
const { loginUser } = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/verifyToken');

// Login
router.post('/login', loginUser);

// Verificar autenticación
router.get('/verify-auth', verifyToken, (req, res) => {
  res.json({ user: req.user }); // <- Esto viene del middleware verifyToken
});

module.exports = router;
