# Task Management System

![Task Management System](https://task-frontend-next.vercel.app/task-manager-logo.png)

## 📋 Overview

A feature-rich task management application built for small teams to efficiently create, assign, track, and manage tasks. This full-stack application provides a seamless user experience with real-time notifications, comprehensive dashboards, and secure authentication.

**Live Demo:** [https://task-frontend-next.vercel.app/](https://task-frontend-next.vercel.app/)

## ✨ Features

### User Authentication
- Secure user registration and login 
- JWT-based authentication
- Password hashing with bcrypt
- Protected routes and session management

### Task Management
- **Create tasks** with comprehensive attributes:
  - Title
  - Description
  - Due date
  - Priority level (Low, Medium, High)
  - Status (Todo, In Progress, Completed)
- **Complete CRUD operations:**
  - Create new tasks
  - View task details
  - Update task information
  - Delete tasks

### Team Collaboration
- Assign tasks to other team members
- Real-time notification system
- Task commenting functionality
- Activity tracking

### Dashboard
- Personalized user dashboards displaying:
  - Tasks assigned to the user
  - Tasks created by the user
  - Overdue tasks requiring attention
  - Task completion statistics

### Search and Filtering
- Powerful search by task title or description
- Advanced filtering options:
  - Filter by status
  - Filter by priority
  - Filter by due date
  - Multi-parameter filtering

## 🛠️ Technology Stack

### Frontend
- **Next.js** - React framework with server-side rendering
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Component library for consistent design
- **Lucide React** - Icon library
- **React Query** - Data fetching and state management
- **React Hook Form** - Form validation and handling

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing

### DevOps
- **Vercel** - Frontend deployment and hosting
- **MongoDB Atlas** - Cloud database hosting

## 📱 Screenshots

### Login Page
![Login Page](https://task-frontend-next.vercel.app/login-screenshot.png)

### Dashboard
![Dashboard](https://task-frontend-next.vercel.app/dashboard-screenshot.png)

### Task Creation Form
![Task Creation](https://task-frontend-next.vercel.app/task-creation-screenshot.png)

## 🚀 Installation and Setup

### Prerequisites
- Node.js (v14 or later)
- MongoDB
- npm or yarn

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/task-management-system.git

# Navigate to frontend directory
cd task-management-system/frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Update environment variables as needed

# Run development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd ../backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Update environment variables with your MongoDB URI, JWT secret, etc.

# Run development server
npm run dev
```

## 🔒 Environment Variables

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/task-management
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/me` - Get current user info

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get a specific task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get a specific user
- `PUT /api/users/:id` - Update a user
### Notyfication
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/:id` - Get a specific notifications
- `PUT /api/notifications/:id` - Update a notifications
## 🏗️ Project Structure

```
task-management-system/
├── frontend/                # Next.js frontend
│   ├── app/                 # App router pages
│   ├── components/          # Reusable components
│   ├── lib/                 # Utility functions and hooks
│   ├── public/              # Static assets
│ 
│
├── backend/                 # Express backend
│   ├── middleware/          # Custom middleware
│   ├── models/              # Mongoose models
│   ├── routes/              # API routes
│   └── utils/               # Utility functions
│
└── README.md                # Project documentation
```

## 🔍 Security Features

- Secure authentication with JWT
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting for API endpoints
- Protection against common attacks (XSS, CSRF)

## 🧪 Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test
```

## 🔄 Future Enhancements

- Email notifications
- Calendar integration
- Task templates
- Time tracking
- Mobile application
- Advanced reporting
- Team performance analytics

## 👥 Contributors

- Your Name - Full Stack Developer

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
