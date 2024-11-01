const User = require("../../models/userSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const user_route = require("../../routes/userRouter");


//Load Homepage
const loadLandingPage = async (req, res) => {
  try {
    const user = req.session.user;
    if(user){
      const userData = await User.findOne({_id:user._id});
      res.render("home",{user:userData})
    } else{
      return res.render('home')
    }
    
  } catch (error) {
    console.log("Homepage not rendered:", error); 
    res.status(500).send("Server error"); 
  }
};

//Home page 

const loadHomepage = async (req, res) => {
  try {
    if(!req.session.user) {
      res.redirect("/login");
    }else {
    res.render("home");
    }
  } catch (error) {
    console.log("Homepage not rendered:", error); 
    res.status(500).send("Server error"); 
  }
};


//loading pagenot found
const pageNotFound = async (req, res) => {
  try {
    res.render("pageNotFound");
  } catch (error) {
    console.log("Error rendering page-404", error);
    res.status(500).send("Server error");
  }
};

//Loading signup page

const loadSignup = async (req, res) => {
  try {
      res.render("signup");
  } catch (error) {
    console.log("Error page rendered", error);
    res.status(500).send("Server not found");
  }
};


//Loading login page
const loadLogin = async(req,res)=> {
  try {
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
}
//Generate otp function

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//Send Verification Email function

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

//Sign Up functionalities

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cpassword } = req.body;
    if (password !== cpassword) {
      return res.render("signup", { message: "Password do not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exists",
      });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(400).json({ error: "Failed to send verification" });
    }
    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };

    console.log("OTP Sent", otp);
    res.redirect("/verify-otp");
  } catch (error) {
    console.error("signup error", error);
    res.redirect("/pageNotFound");
  }
};

//Otp functionalities

const getotp = async (req, res) => {
  try {
    return res.status(200).render("verify-otp");
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//Secure password Function

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Error hashing password", error);
  }
};

//Verify OTP function

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("Recieved otp", otp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
      });
      await saveUserData.save();
      req.session.user = saveUserData._id;
      console.log(req.session.user)
      console.log("helloooo")
      res.json({ success: true });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP,Please try again" });
    }
  } catch (error) {
    console.error("Error Verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
};

//Resend OTP

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log(`Resent otp ${otp}`);
      res
        .status(200)
        .json({ success: true, message: "OTP Resend Successfully" });
    } else {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to Resend OTP Please try again",
        });
    }
  } catch (error) {
    console.error("Error in resending OTP", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error.Please try again",
      });
  }
};

      
//Login functionalities

const login=async(req,res)=>{
  console.log("login is coming")
  try {    
    const {email,password}=req.body;
    const findUser=await User.findOne({isAdmin:0,email:email});
    console.log("hiiii data vannoooo?/",findUser);
    
    if(!findUser){
      return res.json({message:"User not found"})
    }
    if(findUser.isBlocked){
      return res.json({message:"User is blocked by the admin"})
    }
    const passwordMatch=await bcrypt.compare(password,findUser.password)
    console.log(passwordMatch);
    
    if(!passwordMatch){
      return res.json({success : false , message : "incoorect email or password"})
    }
    

    req.session.user= findUser._id;
     return res.json({success : true , message:"Login Successful"})
    console.log(req.session.user)

    
  } catch (error) {
    console.log("login error",error);
   return  res.render({message:"Something went wrong"})
    
  }
}

module.exports = {
  loadHomepage,

  loadLandingPage,
  loadSignup,
  signup,
  getotp,
  verifyOtp,
  resendOtp,
  loadLogin,
  login
};
