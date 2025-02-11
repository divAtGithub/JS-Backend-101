import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser" // Tp manage cookies in server

//create an express server
const app = express();

//To use cors in our website
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from "./routes/user.routes.js";

//routes declaration
//Using app.use() middleware to route paths
app.use("/api/v1/users", userRouter)

export {app}