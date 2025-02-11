import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true, 
        },

        fullName: {
            type: String,
            required: true,
            trim: true, 
            index: true
        },

        avatar: {
            type: String, // cloudinary url
            required: true,
        },

        coverImage: {
            type: String, // cloudinary url
        },

        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],

        password: {
            type: String,
            required: [true, "Password is required"],
        },

        refreshToken: {
            type: String
        }
    },

    {
        timestamps: true
    }
)

//If the password was modified, Hash the password before saving it.(Using pre middleware)
userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
})

// Add a methods to userSchema to verify password
userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password);
}

// Create a method to generate AccessToken for Each user
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            //These fields are encoded in the JWT (token) to quickly identify the field
            _id: this.id,
            userName : this.userName,
            email: this.email,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}

// Create a method to generate RefreshToken for Each user
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            //These fields are encoded in the JWT (token) to quickly identify the targeted field
            _id: this.id,
        },

        process.env.REFRESH_TOKEN_SECRET,

        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}



export const User = mongoose.model("User", userSchema);