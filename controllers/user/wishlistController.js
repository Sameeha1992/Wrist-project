
const User = require("../../models/userSchema");
const Wishlist = require("../../models/wishlistSchema");
const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
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

        const wishListData = await Wishlist .findOne({userId:userData._id})
        .populate({path: "items.productId",model:"Product",
            select:"productName productImage salePrice colorStock brand status"
        });


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

        res.render("wishlist",{user:userData, wishlist:wishListData})
        

       
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

        
        const productExists = wishlist.items.some(item => item.productId.toString() === productId && item.color === color);
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




const addToCartFromWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login to add items to cart"
            });
        }

        const userId = req.session.user;
        const { productId, colorStockId } = req.body;
        const quantity = 1; // Default quantity when adding from wishlist
        const maxLimit = 5;

        // Find the product
        const product = await Product.findById(productId);
        if (!product || product.isBlocked) {
            return res.status(404).json({
                success: false,
                message: "Product is unavailable"
            });
        }

        // Verify color stock
        const colorStock = product.colorStock.id(colorStockId);
        if (!colorStock) {
            return res.status(404).json({
                success: false,
                message: "Color variant not found"
            });
        }

        // Check stock availability
        if (quantity > colorStock.quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${colorStock.quantity} items available in this color`
            });
        }

        // Check if item already exists in cart
        const existingCartItem = await Cart.findOne({
            userId,
            productId,
            colorStockId
        });

        let cartResult;
        if (existingCartItem) {
            const newQuantity = existingCartItem.quantity + quantity;

            // Check quantity limits
            if (newQuantity > maxLimit) {
                return res.status(400).json({
                    success: false,
                    message: `Maximum limit of ${maxLimit} items exceeded`
                });
            }

            if (newQuantity > colorStock.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add more items. Only ${colorStock.quantity} available in this color`
                });
            }

            // Update existing cart item
            cartResult = await Cart.updateOne(
                { _id: existingCartItem._id },
                { $set: { quantity: newQuantity } }
            );
        } else {
            // Create new cart item
            const newCartItem = new Cart({
                userId,
                productId,
                categoryId: product.category,
                colorStockId,
                quantity
            });
            cartResult = await newCartItem.save();
        }

        // Remove item from wishlist
        await Wishlist.updateOne(
            { userId },
            { $pull: { items: { productId: productId } } }
        );

        // Get updated cart count
        const cartItemCount = await Cart.countDocuments({ userId });

        return res.status(200).json({
            success: true,
            message: "Product moved to cart successfully!",
            cartItemCount
        });

    } catch (error) {
        console.error("Error moving item from wishlist to cart:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errorDetails: error.message
        });
    }
};






module.exports={
    getWishlistPage,                                                           
    addToWishlist,
    removeFromWishlist,
    addToCartFromWishlist,
}