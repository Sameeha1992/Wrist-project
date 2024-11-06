const User=require("../../models/userSchema");
const mongoose=require("mongoose");

const bcrypt= require("bcrypt");
const { Admin } = require("mongodb");




const pageerror= async (req,res)=>{
  res.render("adminerror")
}






//Loading the home page
const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("adminLogin",{message:null})
}


//Login functionaliteies:-
const login= async(req,res)=>{
  try {
    const {email,password}=req.body;
    console.log(email,'email')
    console.log(password,'password')

    const admin = await User.findOne({email,isAdmin:true});
    console.log(admin,'admin')
    if(admin){

      const passwordMatch = await bcrypt.compare(password,admin.password);
      console.log(passwordMatch,'passwordMatch')
      if(passwordMatch){
        req.session.admin = true;
        console.log(req.session.admin,'req.session.admin')
        return res.redirect("/admin")
        
      }else {
        return res.redirect("/login")
      }
    } else{
      return res.redirect("/login")
    }
    
    
  } catch (error) {
    console.log("login error",error);
    return res.redirect("/pageerror")
    
    
  }
};


//Dashboard loading

const loadDashboard = async (req,res)=>{
  if(req.session.admin){
    console.log(req.session.admin)
    try {
      res.render("dashboard")
     
    } catch (error) {
      res.redirect("/pageerror")
      
    }
  }
}

const logout=async(req,res)=>{
 
  try {
    req.session.destroy(err=>{
     
      
      if(err){
        console.log("Error destroying session",err);
       
        return res.redirect("/pageerror")

        
      }
      res.redirect("/admin/login")
      console.log("logout aakum");
    })
   
    
   
  } catch (error) {
    console.log("unexpected error during logout");
    res.redirect("/pageerror")
    
  }
}




// //Login function
// const Adminlogin=async(req,res)=>{
//     console.log("login is coming")
//     try {    
//       const {email,password}=req.body;
//       const admin=await User.findOne({isAdmin:true,email});
//       console.log("hiiii data vannoooo?/",admin);

//       if(!admin){
//         return res.json({success:false,message:"Incorrect email or password"})
//       }

//       const passwordMatch=await bcrypt.compare(password,admin.password)
//       console.log("Password match status",passwordMatch);
      
//       if(passwordMatch){
//         req.session.admin=true;
//         return res.json({success:true,message:"Login Successfully"})
//       }  else {
//         return res.json({success : false , message : "Incorrect email or password"})
//       }
      
      
//     } catch (error) {
//       console.log("login error",error);
//      return  res.json({success:false,message:"Something went wrong"})
      
//     }
//   }









// //main
// const Adminlogin= async(req,res)=>{
    
    
//     try {
//         const{email,password}=req.body;
//         const admin = await User.findOne({email,isAdmin:true});
        
        

//         if(admin){
//             const passwordMatch=await bcrypt.compare(password,admin.password);
//             if(passwordMatch){
//                 req.session.admin = true;
                
//                 return res.redirect("/admin/dashboard")
//             } else{
//                 return res.redirect("/admin/login")
//             }
//         } 
        
//     } catch (error) {
//         console.log("login error",error);
//         return res.redirect("/pageerror")
        
//     }
// }


// const loadDashboard=async (req,res)=>{
//     console.log("keritto")
   
//     try {

//         if(req.session.admin){
//             res.render("dashboard");

//         } else{
//             res.redirect("/pageerror")
//         }

        
//     } catch (error) {
        
//     }
// }


module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
}