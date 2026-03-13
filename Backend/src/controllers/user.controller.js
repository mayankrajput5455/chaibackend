import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshTokens = async (userId) => {

  const user = await User.findById(userId)

  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave: false })

  return { accessToken, refreshToken }
};

const registerUser = asyncHandler(async (req, res) => {

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

  const createdUser = await User.findById(user._id)
    .select("-password -refreshToken");

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User Registered Successfully")
  );

});

const loginUser = asyncHandler(async (req, res) => {

  const { username, email, password } = req.body

  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required")
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist. Register first.")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password")
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User Logged In Successfully"
      )
    )

});

const logoutUser = asyncHandler(async (req, res) => {

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))

});

const refreshAccessToken = asyncHandler(async(req, res) => {
  try {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
  
    if(!incomingRefreshToken){
      throw new ApiError(401, "Unauthorized Request")
    }
  
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "Invalid Refresh Token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh Token is Expired or Used")
    }
  
    options = {
      httpOnly: true,
      secure: true
    }
  
    const {accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
  
    return res
      .status(200)
      .cookie("accessToken",accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access Token Refreshed")
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token")
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  generateAccessAndRefreshTokens,
  refreshAccessToken
}