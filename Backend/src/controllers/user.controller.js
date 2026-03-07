import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiError.js";
import { User } from "../models/users.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler (async(req, res) => {
    // user detail from frontend
    const {username, email, fullname, password} = req.body
    console.log("Email :", email);
    
    // validation - not empty
    if([fullname, email, username, password].some((field) => field?.trim() === "")){
        return new ApiError(400, "Fullname is required")
    }
    
    // check if your user already exists
    const existedUser = User.findOne({
        $or: [{usename}, {email}]
    })


    if(existedUser) throw new ApiError(409, "User with email or username already exist");
    console.log("Username: ",username, "Email: ", email)

    // check if avtar is uploaded or not
    const avtarLocalPath = req.files?.avtar[0]?.path()
    const coverImageLocalPath = req.files?.coverImage[0]?.path()

    if(!avtarLocalPath) throw new ApiError(400, "Avtar file is required");

    // Upload them to cloudinary
    const avtar = await uploadOnCloudinary(avtarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avtar) throw new ApiError(400, "Avtar file is required");
    
    // Create user object - Entry in db 
    const user = await User.create({
        fullname,
        avtar: avtar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // Remove password and refreshtoken field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" 
    )

    if(!createdUser) throw new ApiError(500, "Something went wrong while registering the user");

    //response
    return res
        .status(200)
        .json(
            new ApiResponse(200,createdUser, "User Registered Successfully")
        )
})

export { registerUser }