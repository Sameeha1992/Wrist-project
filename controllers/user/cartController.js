const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");









const loadCart = async (req, res) => {
  try {
    
    if (!req.session.user) {
      return res.redirect('/login');
    }

    
    const userId = req.session.user;
    console.log(userId,"USERIDDDDD")
    const userDetails = await User.findById(userId);
    
    if (!userDetails) {
      return res.redirect('/login');
    }

    
    const cartDetails = await Cart.find({ userId })
      .populate({
        path: "productId",
        select: "productName salePrice productImage colorStock isBlocked"
      })
      .populate({
        path: "categoryId",
        select: "name"
      });

  
    const processedCartDetails = cartDetails.map(item => {
      const cartItem = item.toObject();

      
      if (!cartItem.productId || cartItem.productId.isBlocked) {
        cartItem.error = "Product is unavailable";
        return cartItem;
      }

      
      cartItem.quantity = Math.min(cartItem.quantity, 5);

      return cartItem;
    });


    const totalAmount = processedCartDetails.reduce((total, item) => {
      
      return item.productId && !item.productId.isBlocked 
        ? total + (item.productId.salePrice * item.quantity)
        : total;
    }, 0);

    
    res.render("cart", {
      cart: processedCartDetails,
      user: userDetails,
      totalAmount: totalAmount.toFixed(2)
    });

  } catch (error) {
    console.error("Error loading cart:", error);
    res.status(500).render("error", { 
      message: "An error occurred while loading the cart",
      userId: req.session.user 
    });
  }
};



//Add to Cart Functionality



const addToCart = async (req, res) => {
  try {
  
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login to add items to cart" 
      });
    }

    const userId = req.session.user;
    const { productId, quantity, colorStockId } = req.body;
    const maxLimit = 5;

    
    const product = await Product.findById(productId);
    if (!product || product.isBlocked) {
      return res.status(404).json({ 
        success: false, 
        message: "Product is unavailable" 
      });
    }

    
    const colorStock = product.colorStock.id(colorStockId);
    if (!colorStock) {
      return res.status(404).json({ 
        success: false, 
        message: "Color variant not found" 
      });
    }

    
    if (quantity > colorStock.quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${colorStock.quantity} items available in this color` 
      });
    }

    
    const existingCartItem = await Cart.findOne({ 
      userId, 
      productId, 
      colorStockId 
    });

    if (existingCartItem) {
      
      const newQuantity = existingCartItem.quantity + quantity;

    
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

    
      await Cart.updateOne(
        { _id: existingCartItem._id },
        { $set: { quantity: newQuantity } }
      );

      
      const cartItemCount = await Cart.countDocuments({ userId });

      return res.status(200).json({ 
        success: true, 
        message: "Cart updated successfully!",
        cartItemCount,
        remainingStock: colorStock.quantity - newQuantity
      });
    } else {
      
      if (quantity > maxLimit) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot add more than ${maxLimit} items` 
        });
      }

      
      const newCartItem = new Cart({
        userId,
        productId,
        categoryId: product.category,
        colorStockId,
        quantity
      });

      await newCartItem.save();

  
      colorStock.quantity -= quantity;
      await product.save();

      
      const cartItemCount = await Cart.countDocuments({ userId });

      return res.status(200).json({ 
        success: true, 
        message: "Product added to cart successfully!",
        cartItemCount,
        remainingStock: colorStock.quantity
      });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      errorDetails: error.message 
    });
  }
};










const deleteCart = async (req, res) => {
  try {
   
    console.log('Delete Cart Request:', req.body);

  
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login to remove items from the cart"
      });
    }

    const userId = req.session.user;
    const { cartItemId } = req.body;
    console.log(userId,"USERRRR")


    console.log(cartItemId,"CARTITEMID")
    // Validate input
    if (!cartItemId) {
      return res.status(400).json({
        success: false,
        message: "Cart Item ID is required"
      });
    }

    // Find the cart item
    const cartItem = await Cart.findOne({ 
      _id: new mongoose.Types.ObjectId(cartItemId), 
      userId: userId 
    }).populate('productId');

console.log(cartItem,"CARTITEM")
   
    // Check if cart item exists
    if (!cartItem) {
      console.log("Cart Item not found for ID:",cartItemId,"and USer ID",userId)
      return res.status(404).json({
        success: false,
        message: "Cart Item not found"
      });
    }

    // Delete the cart item
    await Cart.findByIdAndDelete(cartItemId);

    // Calculate new total amount
    const remainingCartItems = await Cart.find({ 
      userId: userId 
    }).populate("productId");

    

    const newTotalAmount = remainingCartItems.reduce((total, item) => 
      total + (item.productId.salePrice * item.quantity), 0);

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      newTotalAmount: newTotalAmount.toFixed(2)
    });
    
  } catch (error) {
    // Log the full error for server-side debugging
    console.error('Delete Cart Error:', error);

    // Send a generic error response
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errorDetails: error.message
    });
  }
};






module.exports = {
  loadCart,
  addToCart,
  deleteCart,
  // updateCartQuantity  
};









































// const User=require("../../models/userSchema");
// const Cart = require("../../models/cartSchema");
// const Product =require("../../models/productSchema")


// const addToCart = async (req, res) => {
//   try {
//       const userId = req.session.user; // Extract user ID from session
//       const { categoryId, productId, quantity } = req.body; // Extract request body
//       const maxLimit = 5;

//       // Check if the product already exists in the user's cart
//       const cartItem = await Cart.findOne({ userId, productId });

//       if (cartItem) {
//           // If the product exists, update the quantity
//           const newQuantity = cartItem.quantity + quantity;

//           if (newQuantity > maxLimit) {
//               return res
                
//                   .json({ message: `Maximum limit of ${maxLimit} exceeded.` });
//           }

//           await Cart.updateOne(
//               { userId, productId },
//               { $set: { quantity: newQuantity } }
//           );

//           return res.status(200).json({ message: "Cart updated successfully!" });
//       } else {
//           // If the product doesn't exist, add it to the cart
//           const newCartItem = new Cart({
//               userId,
//               categoryId,
//               productId,
//               quantity,
//           });

//           await newCartItem.save();

//           return res.status(200).json({ message: "Product added to cart successfully!" });
//       }
//   } catch (error) {
//       console.error("Error adding to cart:", error);
//       res.status(500).json({ message: "Internal server error" });
//   }
// };

// module.exports={
//     loadCart,
//     addToCart,
// }