# TypeTogether

A real-time collaborative document editor built with React, Node.js, Express, MongoDB, and Socket.IO.

## Features
- Real-time collaborative editing (multiple users can edit the same document live)
- User authentication (register/login/logout)
- Each user sees and manages only their own documents
- Create, edit, and delete documents
- Modern, responsive, and user-friendly UI/UX
- Live feedback and error handling

## Tech Stack
- **Frontend:** React.js, Axios, Socket.IO-client
- **Backend:** Node.js, Express.js, Socket.IO
- **Database:** MongoDB (local or Atlas)
- **Authentication:** JWT (JSON Web Tokens), bcryptjs
- **Styling:** Custom CSS (with Inter font and modern design)

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/try/download/community) (local or Atlas)

### 1. Clone the Repository
```
git clone <your-repo-url>
cd TypeTogether
```

### 2. Setup the Backend
```
cd server
npm install
```
Create a `.env` file in the `server` directory with:
```
MONGODB_URI=mongodb://localhost:27017/type_together
JWT_SECRET=your_super_secret_jwt_key
```
Start MongoDB (if local):
```
net start MongoDB
```
Start the backend server:
```
npm start
```

### 3. Setup the Frontend
```
cd ../client
npm install
npm start
```

### 4. Open the App
Go to [http://localhost:3000](http://localhost:3000) in your browser.

## Usage
- **Register** a new user or **login** with existing credentials.
- **Create** new documents, **edit** them in real time, and **delete** as needed.
- All changes are saved and synced live for all users editing the same document.
- Click the **Logout** button in the header to log out.

## Project Structure
```
TypeTogether/
  client/      # React frontend
  server/      # Node.js/Express backend
  README.md
```

## Customization
- You can use MongoDB Atlas by updating `MONGODB_URI` in your `.env` file.
- The UI is easily customizable via `client/src/App.css`.


