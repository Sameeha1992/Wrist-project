const express=require("express");
const app=express();
const mongoose=require("mongoose")
const dotenv=require("dotenv").config();



const connectDB = async(req,res)=>{
    try {

        await mongoose.connect(process.config.env.MONGODB_UR)
        
    } catch (error) {
        
    }
}
app.listen(process.env.PORT||3000,()=>{
console.log("Server Running");

})



module.exports=app;