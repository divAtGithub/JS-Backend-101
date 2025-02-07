import mongoose, { mongo } from "mongoose";
import { DB_NAME } from "../src/constants.js";

export const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("\n MONGODB CONNECTED !!! DB HOST: ", connectionInstance.connection.host);
    } catch (error) {
        console.log("Mongo DB Connection Failed !!!, Received following error: ", error);
        process.exit(1);
    }
}