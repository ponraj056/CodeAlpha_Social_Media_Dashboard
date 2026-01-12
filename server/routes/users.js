const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.json({
                success: true,
                users: []
            });
        }

        const users = await User.find({
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { fullName: { $regex: q, $options: 'i' } }
            ]
        })
            .select('username fullName profilePicture bio')
            .limit(10);

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching users'
        });
    }
});

// @route   GET /api/users/:username
// @desc    Get user profile by username
// @access  Public
router.get('/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username })
            .populate('followers', 'username fullName profilePicture')
            .populate('following', 'username fullName profilePicture');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user'
        });
    }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, upload.single('profilePicture'), [
    body('fullName').optional().trim().notEmpty(),
    body('bio').optional().trim().isLength({ max: 160 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { fullName, bio } = req.body;
        const updateData = {};

        if (fullName) updateData.fullName = fullName;
        if (bio !== undefined) updateData.bio = bio;

        if (req.file) {
            // Delete old profile picture if exists
            const user = await User.findById(req.user._id);
            if (user.profilePicture) {
                const oldImagePath = path.join(__dirname, '../..', user.profilePicture);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            updateData.profilePicture = '/uploads/profiles/' + req.file.filename;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
});

// @route   PUT /api/users/:username/follow
// @desc    Follow/unfollow a user
// @access  Private
router.put('/:username/follow', protect, async (req, res) => {
    try {
        if (req.params.username === req.user.username) {
            return res.status(400).json({
                success: false,
                message: 'You cannot follow yourself'
            });
        }

        const userToFollow = await User.findOne({ username: req.params.username });

        if (!userToFollow) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentUser = await User.findById(req.user._id);

        const followingIndex = currentUser.following.indexOf(userToFollow._id);
        const followerIndex = userToFollow.followers.indexOf(currentUser._id);

        if (followingIndex > -1) {
            // Unfollow
            currentUser.following.splice(followingIndex, 1);
            userToFollow.followers.splice(followerIndex, 1);
        } else {
            // Follow
            currentUser.following.push(userToFollow._id);
            userToFollow.followers.push(currentUser._id);
        }

        await currentUser.save();
        await userToFollow.save();

        await userToFollow.populate('followers', 'username fullName profilePicture');
        await userToFollow.populate('following', 'username fullName profilePicture');

        res.json({
            success: true,
            user: userToFollow.getPublicProfile(),
            following: followingIndex === -1
        });
    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error following user'
        });
    }
});

// @route   GET /api/users/:username/followers
// @desc    Get user's followers
// @access  Public
router.get('/:username/followers', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username })
            .populate('followers', 'username fullName profilePicture bio');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            followers: user.followers
        });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching followers'
        });
    }
});

// @route   GET /api/users/:username/following
// @desc    Get user's following
// @access  Public
router.get('/:username/following', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username })
            .populate('following', 'username fullName profilePicture bio');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            following: user.following
        });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching following'
        });
    }
});

module.exports = router;
