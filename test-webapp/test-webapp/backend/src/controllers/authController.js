const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

const authController = {
  // Register a new user
  async register(req, res, next) {
    try {
      const { username, email, password, avatar_url } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }

      // Create new user
      const user = await User.create({ username, email, password, avatar_url });

      // Generate token
      const token = generateToken(user.id);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate token
      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get current user profile
  async getProfile(req, res, next) {
    try {
      const user = req.user;
      const stats = await user.getStats();

      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const user = req.user;
      const updateData = req.body;

      // Check if email is being updated and if it already exists
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findByEmail(updateData.email);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email is already in use'
          });
        }
      }

      // Check if username is being updated and if it already exists
      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await User.findByUsername(updateData.username);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Username is already taken'
          });
        }
      }

      const updatedUser = await user.update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser.toJSON()
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Verify token (for frontend token validation)
  async verifyToken(req, res, next) {
    try {
      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: req.user.toJSON()
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
