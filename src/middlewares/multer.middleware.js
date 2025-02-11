// How Multer Works:
// Receives the file from the frontend when a user uploads an image.
// Stores it in memory or on the server’s disk (depending on configuration).
// Passes the file data to the next middleware or function (e.g., Cloudinary for cloud storage).

import multer from "multer"   

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },

    filename: function (req, file, cb) {
        cb(null, file.originalname)
      }
})

export const upload = multer({storage})