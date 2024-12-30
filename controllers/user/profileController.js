
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



// for checkingg
const forgotEmailValid = async (req, res) => {
  try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (user) {
         
          const currentTime = Date.now();
          if (req.session.userOtp && req.session.userOtp.expiresAt > currentTime) {
             
              console.log("Using existing OTP:", req.session.userOtp.otp);
              return res.render('forgetPass-Otp', {
                  email: req.session.email,
                  message: null,
              });
          }

          
          const otp = generateOtp();
          const otpExpiryTime = Date.now() + 1 * 60 * 1000; 
          req.session.userOtp = { otp, expiresAt: otpExpiryTime };
          req.session.email = email;

         
          const emailSent = await sendVerificationEmail(email, otp);

          if (emailSent) {
              console.log("Generated and sent new OTP:", otp);
              return res.render('forgetPass-Otp', {
                  email: req.session.email,
                  message: null,
              });
          } else {
              return res.json({
                  success: false,
                  message: "Failed to send OTP, please try again.",
              });
          }
      } else {
          res.render("forget-password", {
              message: "User with this email does not exist",
          });
      }
  } catch (error) {
      console.error('Error in forgotEmailValid:', error);
      res.redirect("/pageNotFound");
  }
};


//  Main one:---

// const forgotEmailValid = async(req,res)=>{
//   try {
//     const {email} = req.body;

//     console.log("Received email for OTP generation:", email);

//     const user = await User.findOne({email:email});
//     console.log("User  found:", user); // Debugging line

//     if(user){
//       const otp = generateOtp();
//       console.log("Generated OTP:", otp); // Debugging line

//       const emailSent = await sendVerificationEmail(email,otp);
//       console.log("Email sent status:", emailSent); // Debugging line

//       if(emailSent){ 
//         const otpExpiryTime = Date.now() + 1 *   60 * 1000;
//         req.session.userOtp = { otp, expiresAt: otpExpiryTime };  
//         req.session.email = email;
//         console.log("Session after setting email:", req.session); // Log the entire session

//         console.log("Session data after setting OTP:", req.session.userOtp); // Debugging line

//         res.render('forgetPass-Otp',{
//           email:req.session.email,message:null});
//         console.log("OTP:",otp);
//       }else{
//         res.json({success:false,message:"Failed to sent OTP,Please try again"})
  
//       } 
//     }else{
//       console.warn("No user found with the provided email."); // Debugging line
//       res.render("forget-password",{
//        message:"User with this email does not exist"
//       })
//     }
    
//   } catch (error) {
//     console.error('Error in forgotEmailValid:', error); // Log the error

//     res.redirect("/pageNotFound")
    
//   }
// }


const verifyForgotPassOtp= async(req,res)=>{
      try {
        const enteredOtp = req.body.otp;
        const { otp, expiresAt } = req.session.userOtp || {}; 

        console.log(enteredOtp,"ENTEREDOTP")
        console.log("Stored OTP:", otp); 
        console.log("OTP Expiry Time:", expiresAt); 
        

        if (!otp || Date.now() > expiresAt) {
          console.warn("OTP has expired or does not exist."); 
          return res.json({ success: false, message: 'OTP has expired or does not exist' });
      }



        if(enteredOtp ===otp){
          console.log("OTP verified successfully."); 
        
          res.json({success:true,redirectUrl:"/reset-password"});
        }else{
          console.warn("OTP does not match."); 
          res.json({success:false,message:'OTP not matching'})
        }
        
      } catch (error) {
       console.error('Error verifying OTP:',error);
       res.status(500).json({
        success:false,
        message:'An error occured.Plesae try again later.',
       });
        
      }
};



const resendOtp = async (req, res) => {
  try {
    

    const currentTime = Date.now();

    if(req.session.userOtp && currentTime <req.session.expiresAt){
      const remainingTime = Math.ceil((req.session.userOtp.expiresAt - currentTime)/1000);
      return res.status(429).json({
        success:false,
        message:'Please wait ${remainingTime} seconds before requesting a new OTP'
      })
    }
    
    const otp = generateOtp();
    const otpExpiryTime= Date.now() + 1 * 60 * 1000;
    req.session.userOtp = {otp,expiresAt: otpExpiryTime}; 
    const email = req.session.email;
    console.log("Resending OTP to email:",email);
   
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log(`Resent OTP: ${otp}`);
      res.status(200).json({ success: true, message: "Resend OTP successfully." });

    } 
  } catch (error) {
    console.error("Error in resending OTP", error);
    res.status(500).json({
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




const postNewPassword = async (req, res) => {
  try {
      
      console.log("Request body:", req.body); 

     
      const { newPass1, newPass2 } = req.body;

     const email = req.session.email;

      console.log("Email from session:", email); 

    
      if (newPass1 === newPass2) {
          console.log("Passwords match. Proceeding to hash the password."); 

         
          const passwordHash = await securePassword(newPass1);
          console.log("Hashed Password:", passwordHash); 

         
          const result = await User.updateOne(
              { email: email }, 
              { $set: { password: passwordHash } } 
          );

        
          console.log("Update result:", result); 

          
          if (result.matchedCount === 0) {
              console.warn("No user found with the provided email."); 
              return res.json({success: false, message: 'User not found.'})
          }

          console.log({ success: true, message: "Password updated successfully", redirectUrl: "/login" });
         
          return res.json({success:true,message:"Password updated successfully",redirectUrl:"/login"})
               
      } else {
          console.warn("Passwords do not match."); 
          res.render("reset-password", { message: 'Passwords do not match' }); 
      }
  } catch (error) {
      console.error("Error in postNewPassword:", error); 
      return res.status(500).json({ success: false, message: 'An error occurred while updating the password.' }); 
  }
};


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
    resendOtp,
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