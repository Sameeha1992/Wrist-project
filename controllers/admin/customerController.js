const User = require("../../models/userSchema");



const customerInfo = async(req,res)=>{
    try {
       
        let search ="";
        if(req.query.search){
            search=req.query.search;
        
            
        }
        let page =1;
        if(req.query.page){
            page=req.query.page
            
        }

        const limit=10
        const userData = await User.find({
            isAdmin:false,
            $or:[

                {name:{$regex:".*"+search+".*",$options:"i"}},
                {email:{$regex:".*"+search+".*",$options:"i"}},
                
            ]
        })
        
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();
       

         const count = await User.find({
            isAdmin:false,
            $or:[

                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}},
            ]

         }).countDocuments();
         const totalPages = Math.ceil(count / limit);

         res.render("customers",{
            data: userData,
            totalPages:totalPages,
            currentPage:page,
            search:search

         });


    } catch (error) {
        console.error("Error fetching customer:",error);
        res.status(500).send("An error occure while fetching the customer data.")
        
    }
}


const customerBlocked= async(req,res)=>{
    try {
        let id=req.query.id;
       
        const updatedUser = await User.findOneAndUpdate(
            { _id: id },
            { $set: { isBlocked: true } },
            { new: true } 
          );
          
          if(!updatedUser){
            return res.status(404).json({message:"User not found"})
          }
          

        return res.status(200).json({message:"User blocked successfully"})
        
    } catch (error) {
        res.redirect("/pageerror")
      
    }
}


const customerUnblocked = async(req,res)=>{
    try {
        let id=req.query.id;
       
        const updateUser = await User.findOneAndUpdate(
            { _id: id },
            { $set: { isBlocked: false } },
            { new: true } 
          );

          if(!updateUser){
            return res.status(404).json({message:"User not found"})

          }

          return res.status(200).json({message:"User unblocked successfully"})

        
       } catch (error) {
        console.log("error",error)
        res.redirect("/pageerror");
        
    }
}




module.exports={
    customerInfo,
    customerBlocked,
    customerUnblocked,
}