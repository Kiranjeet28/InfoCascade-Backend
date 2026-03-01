# InfoCascade Backend - Render Deployment Guide

## Prerequisites
- Node.js 18.x
- MongoDB Atlas account (or any MongoDB service)
- Render account (render.com)

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables in `.env`:**
   - `PORT`: Server port (default: 5000)
   - `MONGO_URI`: MongoDB connection string
   - `JWT_SECRET`: JWT secret key (if using authentication)
   - `NODE_ENV`: Set to `development` for local, `production` for deployed

4. **Run locally:**
   ```bash
   npm run dev    # With hot reload using nodemon
   npm start      # Production mode
   ```

## Deployment on Render

### Step 1: Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Create a Web Service on Render
1. Go to [render.com](https://render.com)
2. Sign up/Login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure the service:
   - **Name:** infocascade-backend
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or select as needed)

### Step 3: Set Environment Variables
In Render dashboard:
1. Go to your service
2. Navigate to "Environment" tab
3. Add the following variables:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `MONGO_URI` = `your_mongodb_atlas_connection_string`
   - `JWT_SECRET` = `your_secret_key`
   - `CORS_ORIGIN` = `your_frontend_url`

### Step 4: MongoDB Atlas Setup (if not already done)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get connection string in format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
5. Use this as `MONGO_URI` in Render

### Step 5: Deploy
- Render automatically deploys when you push to your GitHub repository
- Monitor deployment in the "Logs" tab
- Your API will be live at: `https://your-service-name.onrender.com`

## Health Check
Your API includes a health check endpoint:
```bash
GET https://your-service-name.onrender.com/health
```
Returns: `{ "status": "OK" }`

## API Base URL
All API routes are available at:
```
https://your-service-name.onrender.com/api/
```

## Troubleshooting

### Build fails
- Check that `package.json` has correct dependencies
- Verify Node version (18.x recommended)

### Database connection errors
- Verify `MONGO_URI` is correct
- Ensure MongoDB allows connections from Render's IP (Atlas: Security → Network Access → Allow from anywhere)

### CORS errors
- Update `CORS_ORIGIN` environment variable with your frontend URL

### Port issues
- Ensure `PORT` is set as environment variable (Render will assign one)
