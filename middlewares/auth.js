
const nocache = require("nocache");
const User = require("../models/userSchema");   

//User Authentication:-
const userAuth = async (req, res, next) => {
   try {
    if(!req.session.user){
        return res.redirect("/login")
    }
    const user= await User.findById(req.session.user)
    res.setHeader("Cache-Control", "no-store"); 
    if(user && ! user.isBlocked){
        return next()
    } else{
        return res.redirect("/login")
    }
    
   } catch (error) {
    
   }
};
       
const isLogout = (req,res,next)=>{
    try{
        if (req.session?.user) {
            res.setHeader("Cache-Control", "no-store"); 
            return res.redirect("/");
        } else {
            return next();
        }
    }catch(error){
        console.error("Error in adminlogout middleware:", error);
        return res.status(500).send("Internal Server Error");
    }
}

const adminAuth = (req, res, next) => {
    try {
        if (req.session?.admin_id) {
            res.setHeader("Cache-Control", "no-store"); 
            return next();
        } else {
            return res.redirect("/admin/login");
        }
    } catch (error) {
        console.error("Error in adminAuth middleware:", error);
        return res.status(500).send("Internal Server Error");
    }
};

const isAdminLogout = (req,res,next)=>{
    try{
        if (req.session?.admin_id) {
            res.setHeader("Cache-Control", "no-store"); 
            return res.redirect("/admin");
        } else {
            return next();
        }
    }catch(error){
        console.error("Error in adminlogout middleware:", error);
        return res.status(500).send("Internal Server Error");
    }
}

module.exports={
    userAuth,
    isLogout,
    adminAuth,
    isAdminLogout

}