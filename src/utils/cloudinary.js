import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET   
})

const uploadOnCloudinary = async(localFilePath) => {
    try {
        if(!localFilePath) return ("Local File Path Not Present");

        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {resource_type: auto});
        console.log("File is uploaded successfully: ", response.url);

        return response;
    } catch (error) {
        // If there is an error while trying to upload a file, unlink it from our local server by using file System tools(fs)
        fs.unlink(localFilePath);
        
        return null;
    }
}

export {uploadOnCloudinary};