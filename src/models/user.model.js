import mongoose , {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
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
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
    },
    avatar: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String,
    },
    refreshToken: {
        type: String,
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
    ]
},{
    timestamps: true,
}
);

// pre is a hook that runs before saving a document 
// we use pre when we want to perform some action before saving the document
userSchema.pre("save", async function(next) { // Middleware to hash password before saving
    if (this.isModified("password")) { // Check if the password is modified
        this.password = await bcrypt.hash(this.password, 10); // Hash the password before saving
    }
    next();
});

userSchema.methods.isPasswordCorrect = async function(password) { // Method to compare password for each user
    return await bcrypt.compare(password, this.password); // Compare the provided password with the hashed password
};

userSchema.methods.generateAccessToken = function() { // Method to generate JWT access token for each user
    return jwt.sign({ id: this._id, username : this.username, email : this.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }); // Generate a JWT token
}

userSchema.methods.generateRefreshToken = function() { // Method to generate JWT refresh token for each user
    return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }); // Generate a JWT token
}

export const User = mongoose.model("User", userSchema);
