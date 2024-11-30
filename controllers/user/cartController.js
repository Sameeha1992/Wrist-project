const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");








const loadCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const userDetails = await User.findOne({ _id: userId });
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const cartDetails = await Cart.find({ userId })
      .populate({
        path: "productId",
        
        select: "productName salesPrice productImage  colorStock ",
      })
      .populate({
        path: "categoryId",
        select: "name",
      });

    const updatedCartDetails = await Promise.all(cartDetails.map(async (item) => {
      const cartItem = item.toObject();

      if (!cartItem.productId || cartItem.productId.isBlocked) {
        cartItem.availableStock = 0;
        cartItem.error = "This product is unavailable or has been removed.";
      } else {
        cartItem.availableStock = cartItem.productId.stock || 0;
        
        
        if (cartItem.quantity > 5) {
          cartItem.quantity = 5;
          

          await Cart.updateOne(
            { _id: item._id },
            { $set: { quantity: 5 } }
          );
        }

        
        if (cartItem.quantity > cartItem.availableStock) {
          cartItem.quantity = cartItem.availableStock;
          

          await Cart.updateOne(
            { _id: item._id },
            { $set: { quantity: cartItem.availableStock } }
          );
        }
      }

      return cartItem;
    }));

  
    const totalAmount = updatedCartDetails.reduce((total, item) => {
      if (!item.error && item.productId) {
        return total + (item.productId.salesPrice * item.quantity);
      }
      return total;
    }, 0);

    res.render("cart", {
      cart: updatedCartDetails,
      user: userDetails,
      totalAmount: totalAmount.toFixed(2) 
    });
  } catch (error) {
    console.error("Error loading cart:", error.message);
    res.status(500).render("404", { userId: req.session.user });
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log(userId);
    
    const { categoryId, productId, quantity } = req.body;
    const maxLimit = 5;

    
    const product = await Product.findById(productId);
    if (!product || product.isBlocked) {
      return res.json({ 
        success: false, 
        message: "Product is unavailable" 
      });
    }

    
    if (quantity > product.quantity) {
      return res.json({ 
        success: false, 
        message: `Only ${product.quantity} items available in stock` 
      });
    }

    const cartItem = await Cart.findOne({ userId, productId });

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;

      if (newQuantity > maxLimit) {
        return res.json({ 
          success: false, 
          message: `Maximum limit of ${maxLimit} exceeded.` 
        });
      }

      
      if (newQuantity > product.quantity) {
        return res.json({ 
          success: false, 
          message: `Cannot add more items. Only ${product.stock} available in stock` 
        });
      }

      await Cart.updateOne(
        { userId, productId },
        { $set: { quantity: newQuantity } }
      );

      return res.status(200).json({ 
        success: true, 
        message: "Cart updated successfully!" 
      });
    } else {
      

      if (quantity > maxLimit) {
        return res.json({ 
          success: false, 
          message: `Cannot add more than ${maxLimit} items` 
        });
      }

      const newCartItem = new Cart({
        userId,
        categoryId,
        productId,
        quantity ,
      });

      await newCartItem.save();

      return res.status(200).json({ 
        success: true, 
        message: "Product added to cart successfully!" 
      });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
}



const deleteCart = async(req,res)=>{
  try {
    
  } catch (error) {
    
  }
}






// const updateCartQuantity = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     const { productId, quantity } = req.body;

//     if (quantity > 5) {
//       return res.json({ 
//         success: false, 
//         message: 'Maximum limit is 5 items' 
//       });
//     }

//     const product = await Product.findById(productId);
//     if (quantity > product.stock) {
//       return res.json({ 
//         success: false, 
//         message: `Only ${product.stock} items available in stock` 
//       });
//     }

//     await Cart.updateOne(
//       { userId, productId },
//       { $set: { quantity: quantity } }
//     );

//     return res.json({ 
//       success: true, 
//       message: 'Quantity updated successfully' 
//     });
//   } catch (error) {
//     console.error('Error updating quantity:', error);
//     return res.json({ 
//       success: false, 
//       message: 'Error updating quantity' 
//     });
//   }
// };

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