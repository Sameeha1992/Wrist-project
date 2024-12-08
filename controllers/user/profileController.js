
const {Types} = require("mongoose");
const ObjectId = Types.ObjectId;
const User = require("../../models/userSchema");
const nodemailer =require("nodemailer");
const bcrypt = require("bcrypt");
const env= require("dotenv").config();
const session = require("express-session")
const Address = require("../../models/addressSchema");

const user_route=require("../../routes/userRouter");



function generateOtp(){
  const digits = "1234567890";
  let otp='';
  for(let i=0;i<6;i++){
    otp+=digits[Math.floor(Math.random()*10)];
  }
  return otp;
}

const sendVerificationEmail = async (email,otp)=>{
  try {
    const transporter = nodemailer.createTransport({
      service:"gmail",
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD,
      }
    })


    const mailOptions = {
      from:process.env.NODEMAILER_EMAIL,
      to:email,
      subject:"Your OTP for password reset",
      text:`Your OTP is ${otp}`,
      html:`<b><h4>Your OTP: ${otp}</h4><br></b>`
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:",info.messageId);
    return true;
    
  } catch (error) {
    console.error("Error sending email",error.message);
    return false;
  }
}


const securePassword = async (password)=>{
  try {
    const passwordHash = await bcrypt.hash(password,10);
    return passwordHash
    
  } catch (error) {
    console.error("Error")
  }
}



const getForgetPassPage = async(req,res)=>{
  try {
    res.render('forget-password',{message:null})

    
  } catch (error) {
    res.redirect("/pageNotFound")
    
  }
}


const forgotEmailValid = async(req,res)=>{
  try {
    const {email} = req.body;
    const user = await User.findOne({email:email});
    if(user){
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email,otp);
      if(emailSent){ 
        const otpExpiryTime = Date.now() + 1 *   60 * 1000;
        req.session.userOtp = { otp, expiresAt: otpExpiryTime };  
        req.session.email = email;
        res.render('forgetPass-Otp',{
          email,message:null});
        console.log("OTP:",otp);
      }else{
        res.render("forget-password",{message:"Failed to sent OTP,Please try again"})
  
      } 
    }else{
      res.render("forget-password",{
       message:"User with this email does not exist"
      })
    }
    
  } catch (error) {
    res.redirect("/pageNotFound")
    
  }
}


const verifyForgotPassOtp= async(req,res)=>{
      try {
        const enteredOtp = req.body.otp;
        // console.log(req.session.userOtp.otp,'enterdotp')
        if(enteredOtp ===req.session.userOtp.otp){
          // req.session.userOtp =null;
          res.json({success:true,redirectUrl:"/reset-password"});
        }else{
          res.status(400).json({success:false,message:'OTP not matching'})
        }
        
      } catch (error) {
       console.error('Error verifying OTP:',error);
       res.status(500).json({
        success:false,
        message:'An error occured.Plesae try again later.',
       });
        
      }
};



const resendForgetOtp = async (req, res) => {
  try {
    
    const { email } = req.session; 
    if (!email) {
      return res.json({
        success: false,
        message: "Email not found in session. Please request OTP again.",
      });
      
    }

  
    const otp = generateOtp();
    req.session.userOtp = otp; 

    
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log(`Resent OTP to ${email}: ${otp}`);
      res.json({ success: true, message: "OTP resent successfully." });
    } else {
      res.json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in resending OTP", error);
    res.json({
      success: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
};



const getResetPassPage = async(req,res)=>{
  try {
    res.render("reset-password");

    
    
  } catch (error) {
    console.error("Error rendering reset password page")
    res.redirect("/pageNotFound")
    
  }
}





//reset password:-
const postNewPassword = async(req,res)=>{
  try {
    const {newPass1,newPass2} = req.body;
    const email = req.session.email;
    if(newPass1===newPass2){
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        {email:email},
        {$set:{password:passwordHash}}
      )
    
    } 
      
    
    
  } catch (error) {
    res.redirect("/pageNotFound")
    
  }
}




const userProfile = async(req,res)=>{

    try {
      const userId = req.session.user;
      const user = await User.findById(userId);
  
      if(!user){
        return res.send("User not found")
      }
    
      res.render("userProfile",{user})
  
      
    } catch (error) {
      console.error("Error fetching user details",error);
      res.send("Internal Server Error")
      
    }
  
  }


  const updateProfile = async(req,res)=>{
    try {

        const {name ,email,phone} = req.body;
        const userId = req.session.user;

        await User.findByIdAndUpdate(userId,{name,email,phone});

        res.status(200).json({success:true,message:"Profile updated successfully"} )

        
    } catch (error) {
        console.error("Error updating profile:",error);
        res.json({success:false,message:"Failed to update profile"})
        
    }
  }
  

  const changePassword = async(req,res)=>{
    try {
        res.render("change-password")

    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
  }



  const changePasswordValid = async (req, res) => {
    try {

      const userId = req.session.user;
      console.log("User ID from session:",userId);
        
      const user = await User.findById(userId); 
      console.log("User found:", user);
    

        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        
        const isMatch = await user.verifyPassword(req.body.currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "The current password is incorrect" });
        }

        
        if (req.body.newPassword.length < 6) {
            return res.json({ success: false, message: "New password must be at least 6 characters" });
        }

       

        const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully for user',userId });
        

    } catch (error) {
        console.error("Error in changePasswordValid",error);
        res.json({ success: false, message: 'An error occured while chaanging password' });
    }
};


//Address Manageamant

const loadAddressPage = async(req,res)=>{
  try {
    const user_id = req.session.user;
    const userData = await User.findById(user_id);
  
    const addresses = userData ? userData.address :[];

  
   
  
    

    res.render("address",{addresses});


    
  } catch (error) {
    console.log(error.message)
    
  }
}


const addAddress = async (req, res) => {
  try {
    console.log(req.body);

    const userEmail = req.session.user;
    console.log('useremail',userEmail);
    
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "Invalid session data" });
    }

    const user = await User.findOne({ _id: req.session.user });
    console.log(user);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const addressFound = await User.findOne({
      email: userEmail,
      "address.address_name": req.body.name,
    });

    if (addressFound) {
      return res.status(400).json({
        success: false,
        message: "Address with the same name already exists",
      });
    }

    const newAddress = {
      address_name: req.body.name,
      house_name: req.body.house,
      street_address: req.body.street,
      state: req.body.state,
      city: req.body.city,
      pincode: req.body.pincode,
      phone: req.body.phone,
      alt_phone: req.body.altphone,
    };

    console.log(newAddress,"NEWADDRESS")

    user.address.push(newAddress);
    const userData = await user.save();
    console.log(userData);

    return res.status(200).json({
      success: true,
      message: "Address added successfully",
      user: userData,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal server error");
  }
};


const updateAddress = async(req,res)=>{
  try {

    const {id} = req.params;
    const {
      name,
      house,
      street,
      state,
      city,
      pincode,
      phone,
      altphone
    } = req.body;

    const user = await User.findById(req.session.user);

    console.log(req.body,"REQ>SESSION>USER")

    if(!user){
      return res.status(404).json({success:false,message:"User not found"})
    }
    
    const addressToUpdate = user.address.id(id);

    if(!addressToUpdate){
      return res.status(404).json({success:false,message:'Address not found'})
    }

    addressToUpdate.address_name = name;
        addressToUpdate.house_name = house;
        addressToUpdate.street_address = street;
        addressToUpdate.state = state;
        addressToUpdate.city = city;
        addressToUpdate.pincode = pincode;
        addressToUpdate.phone = phone;
        addressToUpdate.alt_phone = altphone;

        // Save the updated user document
        await user.save();
        res.status(200).json({ 
          success: true, 
          message: 'Address updated successfully',
          user: user
      });
    
  } catch (error) {
    console.error('Error updating address:',error);
    res.status(500).json({success:false,message:'Internal server error'})
    
  }
}


const deleteAddress = async(req,res)=>{
  try {
    const addressId = new ObjectId(req.body.elemId);
    console.log(addressId)
    const deleted = await User.findOneAndUpdate({_id:req.session.user},{$pull:{"address":{_id:addressId}}})
    if(deleted){
      res.status(200).json({success:true,message:"Address deleted successfully"});
    }else{
      res.status(400).json({success:false,message:"Address not found"})
    }
    
  } catch (error) {
    res.status(500).json({success:false,message:'Internal Server Error'});
    console.error(error.message);
  }
}





  module.exports={
    getForgetPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendForgetOtp,
    postNewPassword,
    userProfile,
    updateProfile,
    changePassword,
    changePasswordValid,
    loadAddressPage,
    addAddress,
    updateAddress,
    
    deleteAddress,
   
   

  }