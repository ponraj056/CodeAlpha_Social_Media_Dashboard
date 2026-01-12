# Social Media Platform

A modern, full-stack social media platform built with MongoDB, Express.js, and vanilla JavaScript.

## Features

- **User Authentication**: Secure registration and login with JWT
- **Posts**: Create, view, and delete posts with image upload support
- **Interactions**: Like posts and add comments
- **Social Features**: Follow/unfollow users
- **Profile Management**: Edit profile, bio, and profile picture
- **Responsive Design**: Modern, dark-themed UI with smooth animations

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing

### Frontend
- **HTML5**, **CSS3**, **JavaScript** (ES6+)
- Vanilla JS (no frameworks)
- Modern CSS with custom properties
- Responsive design

## Project Structure

```
social-media/
├── server/
│   ├── models/
│   │   ├── User.js
│   │   └── Post.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── posts.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   └── server.js
├── client/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── utils.js
│   │   ├── register.js
│   │   ├── login.js
│   │   ├── feed.js
│   │   └── profile.js
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── profile.html
├── uploads/
│   ├── posts/
│   └── profiles/
├── .env
└── package.json
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment**
Edit `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/social_media
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

3. **Start MongoDB**
Make sure MongoDB is running on your system:
```bash
# On Windows (if MongoDB is installed as a service)
net start MongoDB

# Or run mongod directly
mongod
```

4. **Run the Application**
```bash
npm start

# Or for development with auto-reload
npm run dev
```

5. **Access the Application**
Open your browser and navigate to:
```
http://localhost:5000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Posts
- `POST /api/posts` - Create post (Protected)
- `GET /api/posts/feed` - Get feed (Protected)
- `GET /api/posts/user/:username` - Get user posts
- `GET /api/posts/:id` - Get single post
- `PUT /api/posts/:id/like` - Like/unlike post (Protected)
- `POST /api/posts/:id/comment` - Comment on post (Protected)
- `DELETE /api/posts/:id` - Delete post (Protected)

### Users
- `GET /api/users/search?q=query` - Search users
- `GET /api/users/:username` - Get user profile
- `PUT /api/users/profile` - Update profile (Protected)
- `PUT /api/users/:username/follow` - Follow/unfollow user (Protected)
- `GET /api/users/:username/followers` - Get followers
- `GET /api/users/:username/following` - Get following

## Features Explained

### Authentication
- Secure password hashing with bcryptjs
- JWT token-based authentication
- Protected routes with middleware

### Posts
- Text posts with optional image upload
- Like/unlike functionality
- Comment system
- Delete own posts

### User Profiles
- View any user's profile
- Edit own profile (name, bio, picture)
- Follow/unfollow users
- View followers and following counts

### Feed
- Personalized feed showing posts from followed users and own posts
- Real-time updates for likes and comments
- Image upload with preview

## Security Features

- Password hashing
- JWT authentication
- Input validation
- XSS prevention
- File upload restrictions
- Protected routes

## Design Features

- Modern dark theme
- Glassmorphism effects
- Smooth animations
- Responsive layout
- Custom scrollbar
- Loading states
- Error handling

## Future Enhancements

- Real-time notifications
- Direct messaging
- Hashtags and mentions
- Search functionality
- Infinite scroll
- Image editing
- Video uploads
- Story feature

## License

ISC

## Author

Social Media Platform - Full Stack Application
