import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = async (req, res, next) => {
  try {
    const { username, email, fullname, password } = req.body;

    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
      throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existedUser) {
      throw new ApiError(409, "User already exists");
    }
    // console.log(req.files);
    

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
      throw new ApiError(500, "Avatar upload failed");
    }

    let coverImg = "";
    if (coverImageLocalPath) {
      const cover = await uploadOnCloudinary(coverImageLocalPath);
      coverImg = cover?.url || "";
    }

    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImg,
      email,
      password,
      username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(201).json(
      new ApiResponse(201, createdUser, "User Registered Successfully")
    );

  } catch (error) {
    next(error);
  }
};

export { registerUser };