import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler( async (req, res) => {

    const {fullName, email, username, password} = req.body;

    //console.log(req);

    const hasEmptyValue = [fullName, email, username, password].some((item) => item === "" || item === null || item === undefined );
    console.log(hasEmptyValue);

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

export {registerUser}