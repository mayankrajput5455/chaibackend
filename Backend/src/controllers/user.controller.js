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

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid Password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"))

});

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "User Fetched Successfully!")
    )
});

const updateAccountDetail = asyncHandler(async(req, res) => {
  const { fullname, email } = req.body

  if(!fullname || !email){
    throw new ApiError(400, "All field are required")
  }

  const user = await User.findByIdAndUpdate(
    user?._id,
    {
      fullname,
      email,

    },
    {new : true}
  ).select("-password ")

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Account Detail updated Successfully!")
    )
});

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is Missing")
  }
  
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  
  if(!avatar.url){
    throw new ApiError(400, "Error while uploading avatar")
  }
  
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {new : true}
  )

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Avatar Changed Successfully!")
    )

});

const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
    throw new ApiError(400, "Cover Image file is Missing")
  }
  
  const coverImg = await uploadOnCloudinary(coverImageLocalPath)
  
  if(!coverImg.url){
    throw new ApiError(400, "Error while uploading cover image")
  }
  
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImg: coverImg.url
      }
    },
    {new : true}
  )

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Cover Image Changed Successfully!")
    )

});



export {
  registerUser,
  loginUser,
  logoutUser,
  generateAccessAndRefreshTokens,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetail,
  updateUserAvatar,
  updateUserCoverImage
}