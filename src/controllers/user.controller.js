import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

//These will be used multiple times, so declaring them globally.
const cookieOptions = {
    httpOnly: true,
    secure: true
}

const generateAccessTokenAndRefreshToken = async(userId) => {

    try {
            const user = await User.findById(userId);
            // console.log("user: ", user);

            const accessToken =  await user.generateAccessToken();
            const refreshToken = await user.generateRefreshToken();
        
            user.refreshToken = refreshToken;
            await user.save({validateBeforeSave: false});

            // console.log("New Access token:  ", accessToken);
            // console.log("Refresh token: ", refreshToken)
        
            return {accessToken, refreshToken};     
    }

    catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access-Token And Refresh-Token")
    }
}

const registerUser = asyncHandler( async (req, res) => {

    const {fullName, email, username, password} = req.body;

    // console.log(req.body);

    const hasEmptyValue = [fullName, email, username, password].some((item) => item === "" || item === null || item === undefined );
    //console.log(hasEmptyValue);

    if (hasEmptyValue){
        throw new ApiError(400, "Empty field received, Please provide a valid value");
    }

    const isUserAlreadyExist = await User.findOne(
        {
            $or: [{username}, {email}]
        }
    )

    if (isUserAlreadyExist){
        throw new ApiError(409, "User already exists.");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    if (!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file upload on cloudinary failed.");
    }

    const user = await User.create(
        {
            fullName,
            username,
            email,
            avatar: avatar?.url,
            coverImage: coverImage?.url || "",
            password,
        }
    )

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if( !createdUser ){
        throw new ApiError(500, "Something went wrong, while creating new user.");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
    
})

const loginUser = asyncHandler( async (req, res) => {
    // console.log("reqbody: ", req.body);

    const {username, email, password} = req.body;

    if( !username && !email){
        throw new ApiError(400, "Username or email is required");
    }

    // const user = await User.findOne({
    //     $or: [{username, email}]
    // })

    const user = await User.findOne({username});

    if(!user){
        throw new ApiError(404, "User does not exist.");
    }

    // console.log(user);

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findOne(user._id).select("-password -refreshToken");

    return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully!"
        )
    )


})

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

    return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));

})

const refreshAccessToken = asyncHandler( async (req, res) => {

    const incomingRefreshToken = req?.cookies?.refreshToken || req.body.refreshToken;

    // console.log(typeof(incomingRefreshToken)); //type is string

    if( !incomingRefreshToken || incomingRefreshToken === "undefined"){
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // console.log("decodedToken: ", decodedToken);

    const user = await User.findById(decodedToken?._id);

    if (!user){
        throw new ApiError(401, "Invalid refresh token");
    }

    const existingToken = user?.refreshToken;

    // console.log("existing: ", existingToken);

    if(incomingRefreshToken !== existingToken){
        throw new ApiError(401, "Invlid refresh token, Please login again");
    }

    //These database requests always return a promise, so make sure to always use await. 
    // Otherwise we'll have a promise object not the actual value
    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(decodedToken?._id);

    return res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
        new ApiResponse(
            201,
            "new Access token generated successfully"
        )
    )

})

const changePassword = asyncHandler( async(req, res) => {

    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!(isPasswordCorrect)){
        throw new ApiError(400, "Invalid password");
    }

    user.password = newPassword;

    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Password changed successfully"
    ))
})

const getCurrentUser = asyncHandler( async(req, res) => {
    const user = req?.user;

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Current user fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler( async(req, res) => {

    const {fullName, email} = req.body;

    if( !(fullName && email)){
        throw new ApiError(400, "Empty values received for updating");
    }

    // one of the ways to update user fields. not sure if it'll work or not
    // const user = req?.user;
    // user.fullName = fullName;
    // user.email = email;
    // const updatedUser = await user.save({validateBeforeSave : false}, {new : true}).select("-password - refreshToken");

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },

        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedUser,
        "Account details updated Successfully"
    ))
})

const updateUserAvatar = asyncHandler( async(req, res) => {

    const avatarLocalPath = req?.file?.path;

    if (! avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing");
    }

    const cloudinaryResponse = await uploadOnCloudinary(avatarLocalPath);

    if (! cloudinaryResponse?.url ){
        throw new ApiError(400, "File upload on cloudinary server failed");
    }

    const user = await User.findByIdAndUpdate(

        req?.user?._id,
        {
            $set: {
                avatar: cloudinaryResponse?.url
            }
        },
        {new: true}

    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar image updated successfully"
        )
    )
})

const updateUserCoverImage = asyncHandler( async(req, res) => {

    const coverImageLocalPath = req?.file?.path;

    if (! coverImageLocalPath){
        throw new ApiError(400, "Avatar file is missing");
    }

    const cloudinaryResponse = await uploadOnCloudinary( coverImageLocalPath );

    if (! cloudinaryResponse?.url ){
        throw new ApiError(400, "File upload on cloudinary server failed");
    }

    const user = await User.findByIdAndUpdate(

        req?.user?._id,
        {
            $set: {
                coverImage: cloudinaryResponse?.url
            }
        },
        {new: true}

    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Cover image updated successfully"
        )
    )
})

const getUserChannelProfile = asyncHandler( async(req, res) => {
    const {username} = req.params;

    if(!username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },

        {
           $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
           } 
        },

        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },

        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },

                channelSubscribedToCount: {
                    $size: "subscribedTo"
                },

                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },

        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        },
    ])

    if (!channel?.length){
        throw new ApiError (404, "Channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User Channel fetched successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}