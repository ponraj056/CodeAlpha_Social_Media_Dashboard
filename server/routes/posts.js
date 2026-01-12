const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/posts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', protect, upload.single('image'), [
    body('content').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { content } = req.body;
        const postData = {
            author: req.user._id,
            content
        };

        if (req.file) {
            postData.image = '/uploads/posts/' + req.file.filename;
        }

        const post = await Post.create(postData);
        await post.populate('author', 'username fullName profilePicture');

        res.status(201).json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating post',
            error: error.message
        });
    }
});

// @route   GET /api/posts/feed
// @desc    Get feed posts (user's posts + following posts)
// @access  Private
router.get('/feed', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const user = await User.findById(req.user._id);
        const feedUserIds = [req.user._id, ...user.following];

        const posts = await Post.find({ author: { $in: feedUserIds } })
            .populate('author', 'username fullName profilePicture')
            .populate('comments.user', 'username fullName profilePicture')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        const total = await Post.countDocuments({ author: { $in: feedUserIds } });

        res.json({
            success: true,
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get feed error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching feed'
        });
    }
});

// @route   GET /api/posts/user/:username
// @desc    Get posts by username
// @access  Public
router.get('/user/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const posts = await Post.find({ author: user._id })
            .populate('author', 'username fullName profilePicture')
            .populate('comments.user', 'username fullName profilePicture')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            posts
        });
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching posts'
        });
    }
});

// @route   GET /api/posts/:id
// @desc    Get single post
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username fullName profilePicture')
            .populate('comments.user', 'username fullName profilePicture');

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching post'
        });
    }
});

// @route   PUT /api/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.put('/:id/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const likeIndex = post.likes.indexOf(req.user._id);

        if (likeIndex > -1) {
            // Unlike
            post.likes.splice(likeIndex, 1);
        } else {
            // Like
            post.likes.push(req.user._id);
        }

        await post.save();
        await post.populate('author', 'username fullName profilePicture');

        res.json({
            success: true,
            post,
            liked: likeIndex === -1
        });
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking post'
        });
    }
});

// @route   POST /api/posts/:id/comment
// @desc    Comment on a post
// @access  Private
router.post('/:id/comment', protect, [
    body('text').trim().isLength({ min: 1, max: 300 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        post.comments.unshift({
            user: req.user._id,
            text: req.body.text
        });

        await post.save();
        await post.populate('author', 'username fullName profilePicture');
        await post.populate('comments.user', 'username fullName profilePicture');

        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding comment'
        });
    }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if user is the author
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this post'
            });
        }

        // Delete image if exists
        if (post.image) {
            const imagePath = path.join(__dirname, '../..', post.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Post.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting post'
        });
    }
});

module.exports = router;
