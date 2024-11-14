const User = require("../../models/userSchema");

const user_route=require("../../routes/userRouter");
const bcrypt = require("bcrypt")





const userProfile = async(req,res)=>{

    try {
      const userId = req.session.user;
      const user = await User.findById(userId);
  
      if(!user){
        return res.status(404).send("User not found")
      }
      console.log("userProfile is working",user)
      res.render("userProfile",{user})
  
      
    } catch (error) {
      console.error("Error fetching user details",error);
      res.status(500).send("Internal Server Error")
      
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
        res.status(500).json({success:false,message:"Failed to update profile"})
        
    }
  }
  

  const changePassword = async(req,res)=>{
    try {
        res.render("change-password")

    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
  }



  // const changePasswordValid= async(req,res)=>{
  //   try {
      
  //     const { email, currentPassword, newPassword, confirmNewPassword } = req.body;

  //     console.log("Request Body:", req.body);
        

        
  //       const user =await User.findOne(user);
  //       console.log("User:",user)
        
        

  //       if(!user){
  //         return res.status(404).json({success:false,message:'User not found'});
  //       }

  //       if(!email){
  //         return res.status(404).json({success:false,message:"Email not found"})
  //       }

  //       const isMatch = await user.verifyPassword(currentPassword);
  //       if(!isMatch){
  //           return res.status(400).json({success:false,message:"The current password is incorrect"})
  //       }

  //       if(newPassword.length<6){
  //           return res.status(400).json({success:false,message:"New password must be atleast 6 characters"})
  //       }

  //       if(newPassword!==confirmNewPassword){
  //         return res.status(400).json({success:false,message:"Passwords does not match"})
  //       }

  //       const hashedPassword = await bcrypt.hash(newPassword,10);
  //       user.password = hashedPassword;
  //       await user.save();

    
  //       res.status(200).json({success:true, message: 'Password changed successfully' });
       
        
  //   } catch (error) {

  //       console.error(error);
  //       res.status(500).json({success:false, message: 'Server error' });
        
  //   }
  // }

  const changePasswordValid = async (req, res) => {
    try {

      const userId = req.session.user;
      console.log("User ID from session:",userId);
        
      const user = await User.findById(userId); 
      console.log("User found:", user);
    

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        
        const isMatch = await user.verifyPassword(req.body.currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "The current password is incorrect" });
        }

        
        if (req.body.newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
        }

       

        const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password changed successfully for user',userId });
        

    } catch (error) {
        console.error("Error in changePasswordValid",error);
        res.status(500).json({ success: false, message: 'An error occured while chaanging password' });
    }
};



  module.exports={
    userProfile,
    updateProfile,
    changePassword,
    changePasswordValid,
  }