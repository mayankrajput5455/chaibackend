import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: 'process.env.CLOUDINARY_CLOUD_API_KEY', 
    api_secret: 'process.env.CLOUDINARY_CLOUD_SECRET' 
});

const uploadOnCloudinary = async (localFilePAth) => {
    try {
        if(!localFilePAth) return null;

        const response = await cloudinary.uploader.upload(localFilePAth, {
            resource_type: "auto"
        })

        console.log("File is uploaded on Cloudinary", response.url)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePAth);
        return null;
    }
}


export { uploadOnCloudinary }