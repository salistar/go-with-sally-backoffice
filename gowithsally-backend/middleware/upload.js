// ============================================================
// 📄 upload.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('upload.js ▶ Module loaded')
//   • console.log('upload.js ▶ upload handler() called')
// ============================================================

console.log('📄 [upload.js] ▶ Module loaded');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📄 [upload.js] ▶ Setting destination for upload');
    const uploadPath = path.join(uploadsDir, req.user?.id || 'temp');

    // Create user-specific directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomStr = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${randomStr}${ext}`;
    console.log(`📄 [upload.js] ▶ Generated filename: ${filename}`);
    cb(null, filename);
  },
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  console.log('📄 [upload.js] ▶ Validating file type');

  // Allowed MIME types
  const allowedMimes = {
    photos: ['image/jpeg', 'image/png', 'image/webp'],
    documents: ['application/pdf', 'image/jpeg', 'image/png'],
    all: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  };

  const fileType = req.body.fileType || 'all';
  const allowed = allowedMimes[fileType] || allowedMimes.all;

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowed.join(', ')}`));
  }
};

// Single file upload (photos, profile pictures)
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('file');

// Multiple files upload (documents)
const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).array('files', 5);

// Wrapper to handle multer errors
const handleUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      console.log('📄 [upload.js] ▶ upload handler() called');

      if (err instanceof multer.MulterError) {
        console.error(`📄 [upload.js] ▶ Multer error: ${err.message}`);

        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(413).json({
            success: false,
            message: 'File size exceeds maximum limit',
          });
        }

        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(413).json({
            success: false,
            message: 'Too many files. Maximum 5 files allowed.',
          });
        }

        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      if (err) {
        console.error(`📄 [upload.js] ▶ Upload error: ${err.message}`);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  };
};

module.exports = {
  uploadSingle: handleUpload(uploadSingle),
  uploadMultiple: handleUpload(uploadMultiple),
};
