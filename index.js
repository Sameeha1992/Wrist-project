const express=require("express");
const app=express();
const path=require("path");
const nocache = require("nocache");
const mongoose=require("mongoose")
const dotenv=require("dotenv").config();
const session=require("express-session")
const userRouter=require("./routes/userRouter")
const adminRouter=require("./routes/adminRouter");
const passport=require("./config/passport")
const flash = require('connect-flash')

const connectDB = async(req,res)=>{
    try {
       console.log("Attempt to connect Mongodb")
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Database Working")
    } catch (error) {
        console.error("MongoDb connection error",error)
        
        
    }
}


connectDB()


  app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,           
    saveUninitialized: false, 
    cookie: { secure: false,
      maxAge:1000*60*60
     } 
  }));


  app.use(flash());

  app.use((req,res,next)=>{
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
  })

  
app.use(passport.initialize());
app.use(passport.session())

app.use(express.json());
app.use(express.urlencoded({extended:true}))


// app.use(cookieSession({
//     name: 'google-auth-session',
//     keys: ['key1', 'key2']
//   }))


app.use(nocache());


app.set("view engine","ejs");
app.set("views", [
    path.join(__dirname, "/views/user"),
    path.join(__dirname, "/views/admin")
]);

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.userId = req.session.user || null; 
  
    res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/",userRouter);

app.use("/admin",adminRouter);



app.use((err, req, res, next) => {
  console.error("Error occurred:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});


const PORT=process.env.PORT||3000
app.listen(PORT,()=>{
console.log(`Server Running at ${PORT} `);

})



module.exports=app;