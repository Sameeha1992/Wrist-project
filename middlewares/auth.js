
const User = require("../models/userSchema");



const userAuth= (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect("/login")
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware",err);
            res.status(500).send("Internal Server error")
        })
    }else{
        res.redirect("/login")
    }
}


// Admin authentication:


const adminAuth= (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/login")
        }
    })
   .catch(error=>{
    console.log("Error in adminauth middleware",error);
    res.status(500).send("Internal Server Error")
   })
}

// //Updated Authentication:-

// const adminAuth = (req,res,next)=>{
//     try {
//         if(req.session.admin && req.session.admin.isAdmin){
//             next()
//         } else{
//             res.redirect("/admin/login")
//         }
        
//     } catch (error) {
//         console.error("Error in adminAuth middleware",error);
//         res.status(500).send("Internal Server Error")
        
//     }
// }


module.exports={
    userAuth,
    adminAuth

    
}