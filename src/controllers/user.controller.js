import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//generating method for access and refresh token
// const generateAccessAndRefreshTokens = async (userId) => {
//   try {
//     // find by user id given in params
//     await User.findById(userId);

//     // get ref from upper function
//     const accessToken = User.generateRefreshToken();
//     const refreshToken = User.generateAccessToken();

//     // get refreshtoken from User object and save, also used validation beforesave to false
//     User.refreshToken = refreshToken;
//     await User.save({ validateBeforeSave: false });

//     // return both
//     return { accessToken, refreshToken };
//   } catch (error) {
//     // throw custom error
//     throw new ApiError(
//       500,
//       "something went wrong generating refresh and access token"
//     );
//   }
// };

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId); // ✅ fetch user instance

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken(); // ✅ instance method
    const refreshToken = user.generateRefreshToken(); // ✅ instance method

    user.refreshToken = refreshToken; // ✅ set on this user
    await user.save({ validateBeforeSave: false }); // ✅ save this user

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend/ payloads
  // validation
  // check if user alreday exists: username, email
  // check for images, check for avatar
  // upload that to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refreshtoken field from response
  // check for user creation
  // return response

  const { fullname, email, username, password } = req.body;
  console.log("email: ", email);

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  /*-------------------------------------------------------------------*/

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username exists");
  }
  // console.log(req.files);
  /*-------------------------------------------------------------------*/

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  /*-------------------------------------------------------------------*/

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshtoken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // check if user have access token

  // get data from req body
  // username or email
  // find the user
  // check if user exist
  // check username and password
  // access and refreshtoken
  // send cookies

  // getting items ffrom req.body
  const { email, username, password } = req.body;

  //check if username  and email are available if not available throw custom error made for errors
  if (!username && !email) {
    throw new ApiError(400, "Username Or Email is required!");
  }

  // using $or method to find both at one time
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // if user not available throw custom error
  if (!user) {
    throw new ApiError(404, "User Does not exists");
  }

  // check if password is valid through the validation method
  const isPasswordValid = await user.isPasswordCorrect(password);

  // check if validated password correct
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // used generate acc and ref token method passed a user id and extracted both from the returning value
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // find user and remove password and refreshtoken field and then name it loggedin user
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // sending an option method to front end so somebody cannot modify the cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  // return response including status, cookie for accesstoken, cookie for refreshtoken and json
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshtoken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (incomingRefreshToken) {
    throw new ApiError(401, "unauthorized req");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid ref token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "ref token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Accesstoken refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
