# ☁ NimbusDrive — Google Drive Clone

A full-stack cloud storage app built with **Node.js + Express** (backend) and **React** (frontend).  
Users can sign up, upload files, organise into folders, star, trash, preview, and share files via public URLs.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Auth** | JWT-based register / login / logout |
| **Upload** | Drag-and-drop or click; multi-file; progress bar; up to 100 MB/file |
| **Folders** | Create, navigate (breadcrumb), delete folders |
| **File actions** | Rename, star, move to trash, restore, permanently delete |
| **Preview** | Images, video, audio, PDF, plain text — inline in modal |
| **Share** | Generate a public shareable URL; toggle on/off; download without login |
| **Storage meter** | Per-user quota tracking (default 1 GB) |
| **Views** | Grid and list toggle |
| **Search** | Real-time file name search |
| **Context menu** | Right-click any file or folder |

---

## 🗂 Project Structure

```
nimbuscloud/
├── backend/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js             # JWT protect middleware
│   │   └── upload.js           # Multer disk storage
│   ├── models/
│   │   ├── User.js
│   │   ├── File.js
│   │   └── Folder.js
│   ├── routes/
│   │   ├── auth.js             # /api/auth/*
│   │   ├── files.js            # /api/files/*
│   │   └── share.js            # /api/share/*
│   ├── uploads/                # Uploaded files stored here (gitignored)
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── FileContextMenu.jsx
        │   ├── PreviewModal.jsx
        │   ├── ShareModal.jsx
        │   ├── Sidebar.jsx
        │   └── StorageBar.jsx
        ├── context/
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── AuthPage.jsx
        │   ├── DrivePage.jsx
        │   └── SharedFilePage.jsx
        ├── utils/
        │   ├── api.js
        │   └── fileHelpers.js
        ├── App.css
        ├── App.jsx
        └── index.js
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **MongoDB** running locally (`mongodb://localhost:27017`) — or a MongoDB Atlas URI

### 1. Clone & install

```bash
git clone <your-repo>
cd nimbuscloud

# Install root dev tools
npm install

# Install backend + frontend dependencies
npm run install:all
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nimbuscloud
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRE=7d
BASE_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000
```

### 3. Run in development

From the **root** folder:

```bash
npm run dev
```

This starts:
- Backend on **http://localhost:5000**
- Frontend on **http://localhost:3000**

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` | — |
| POST | `/api/auth/login` | `{email, password}` | — |
| GET  | `/api/auth/me` | — | ✅ |

### Files
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/files/upload` | Upload files (multipart) | ✅ |
| GET  | `/api/files` | List files (query: folderId, starred, trashed, search) | ✅ |
| GET  | `/api/files/:id` | Get single file | ✅ |
| PUT  | `/api/files/:id/rename` | Rename file | ✅ |
| PUT  | `/api/files/:id/star` | Toggle star | ✅ |
| PUT  | `/api/files/:id/trash` | Toggle trash | ✅ |
| PUT  | `/api/files/:id/move` | Move to folder | ✅ |
| DELETE | `/api/files/:id` | Permanently delete | ✅ |
| GET  | `/api/files/:id/download` | Download file | ✅ |
| POST | `/api/files/folders` | Create folder | ✅ |
| GET  | `/api/files/folders/list` | List folders | ✅ |
| DELETE | `/api/files/folders/:id` | Delete folder | ✅ |

### Share
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/share/:fileId/link` | Toggle public share link | ✅ |
| GET  | `/api/share/:token` | Get shared file info | — |
| GET  | `/api/share/:token/download` | Download shared file | — |

---

## 🏗 Production Deployment

### Backend
1. Set `NODE_ENV=production` in `.env`
2. Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for cloud DB
3. Set `BASE_URL` to your server domain
4. Consider using **AWS S3 / Cloudflare R2** instead of local disk for `uploads/`

### Frontend
```bash
cd frontend
npm run build
```
Serve the `build/` folder via Nginx, or deploy to **Vercel / Netlify**.  
Set `REACT_APP_API_URL=https://your-api-domain.com/api` in a `.env` file.

---

## 🔒 Security Notes

- Passwords are hashed with **bcryptjs** (salt 10)
- JWTs expire in 7 days by default
- File uploads are sandboxed per-user (`uploads/<userId>/`)
- Share tokens are random UUIDs — hard to guess
- SQL injection is not applicable (MongoDB), but inputs are validated

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, React Dropzone, Axios |
| Backend | Node.js, Express 4, Mongoose, Multer, JWT, bcryptjs |
| Database | MongoDB |
| Styling | Pure CSS (custom design system, no UI library) |
| Fonts | Sora + JetBrains Mono (Google Fonts) |
