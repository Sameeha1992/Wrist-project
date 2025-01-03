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
        return res.redirect("/admin")
    }
    res.render("adminLogin",{message:null})
}


//Login functionaliteies:-
const login= async(req,res)=>{
  try {
    const {email,password}=req.body;
  

    const admin = await User.findOne({email,isAdmin:true});
  
    if(admin){

      const passwordMatch = bcrypt.compare(password,admin.password);
      
      if(passwordMatch){
        req.session.admin_id = admin._id;
      
        return res.json({success : true});
        
      }else {
        return res.json({success : false , message : 'password not match please try again'})
      }
    } else{
      return res.json({success : false  , message : 'admin not found'});
    }
  } catch (error) {
    console.log("login error",error);
    return res.status(500).json({success : false , message : "An error occured please try again later"})
  }
};

//Dashboard loading

const loadDashboard = async (req,res)=>{
  try {
      res.render('dashboard');
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const logout=async(req,res)=>{
  try {
    
    if(req.session.admin_id) {
      delete req.session.admin_id

    }
     
      res.redirect("/admin/login")
          
  
  } catch (error) {
    console.log("unexpected error during logout");
    res.redirect("/pageerror")
    
  }
}



module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
   
}