// controllers/userController.js
const SignupUser = require('../models/userModel');

// 사용자 조회 로직
exports.checkUser = async (req, res) => {
  const { uid, userPhoneNumber } = req.body;

  try {
    const user = await SignupUser.findOne({ uid, userPhoneNumber });

    if (user) {
      return res.status(200).json({ exists: true, message: 'User found' });
    } else {
      return res.status(200).json({ exists: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error checking user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};