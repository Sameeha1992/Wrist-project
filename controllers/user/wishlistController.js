
const User = require("../../models/userSchema");
const Wishlist = require("../../models/wishlistSchema");
const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema");
const {addToCart} = require("../user/cartController")
const mongoose = require("mongoose");

const getWishlistPage = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.redirect("/login")
        }

        const userData = await User.findById(req.session.user)

        if(!userData){
            return res.status(404).render("404",{message:"User not found"})
        }
const wishListData = await Wishlist.findOne({ userId: userData._id })
    .populate({
        path: "items.productId",
        model: "Product",
        select: "productName productImage salePrice colorStock", 
    });

console.log(wishListData, "wishlist dataaaaaaaa"); 


        if(!wishListData){
            const newWishlist = await Wishlist.create({
                userId:userData._id,
                items:[]
            });

        }

        const filteredItems = wishListData.items.filter(item=>{
            return !item.productId.isBlocked;
        })
        wishListData.items=filteredItems;
       

        res.render("wishlist",{user:userData,wishlist:wishListData})
        

       
    } catch (error) {
        console.log(error.message);
        res.status(500).render('500')
    }

}


const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user; 
        const { productId, color } = req.body;

        
       
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        
        const productExists = wishlist.items.some(item => item.productId.toString() === productId);
        if (productExists) {
            return res.status(400).json({ success: false, message: "Product already exists in the wishlist" });
        }

       
        
        wishlist.items.push({ productId ,color });
        await wishlist.save();

        res.status(200).json({ success: true, message: "Product added to wishlist successfully" });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};




const removeFromWishlist = async(req,res)=>{

    try {

        const {productId} = req.body;
        const userId= req.session.user;

        console.log("my products id",productId);
        console.log(userId,"useriddd")
        console.log(req.body,"REQ.body")

        if(!productId || !mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({
                success: false,
                message:"Invalid product"
            });
        }

        if(!userId || !mongoose.Types.ObjectId.isValid(userId)){
            return res.status(401).json({
                success: false,
                message:"User not authenticated please login"
            })
        }


        const userObjectId = new mongoose.Types.ObjectId(userId);
        const productObjectId = new mongoose.Types.ObjectId(productId);

        console.log(userObjectId,"User object id");
        console.log(productObjectId,"Product id of the object")

        const result = await Wishlist.updateOne(
            {userId:userObjectId},
            {
                $pull: {
                    items:{
                        productId:productObjectId,
                      
                    }
                }
            }
        )

        console.log(result,"Result")

        if(result.modifiedCount ===0){
            return res.status(404).json({
                success: false,
                message: "Product not found in wishlist"
            })
        }
        

        const updatedWishlist = await Wishlist.findOne({userId:userObjectId});


        console.log(updatedWishlist,"updated wishlist")
        const wishlistCount = updatedWishlist ? updatedWishlist.items.length :0;

        console.log(wishlistCount,"My wishlist count")

        return res.status(200).json({
            success:true,
            message:"Product removed from wishlist successfully",
            wishlistCount:wishlistCount
        })
    } catch (error) {

        console.error("Error removing item from wishlist:",error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
        
    }
}





module.exports={
    getWishlistPage,                                                           
    addToWishlist,
    removeFromWishlist,
    
}