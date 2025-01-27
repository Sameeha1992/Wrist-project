const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/cartSchema")
const mongoose = require("mongoose");

const loadCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user;

    const userDetails = await User.findById(userId);

    if (!userDetails) {
      return res.redirect("/login");
    }

    const cartDetails = await Cart.find({ userId })
      .populate({
        path: "productId",
        select: "productName regularPrice salePrice productImage colorStock isBlocked",
        populate:{
          path: 'category',
          match: { isListed: true } // Check category listing
        }
      })
      .populate({
        path: "categoryId",
        select: "name",
      })
      





    const processedCartDetails = await Promise.all(
      cartDetails.map(async (item)=>{
        const cartItem = item.toObject();

        
        const colorStock = cartItem.productId.colorStock.find(
          stock => stock._id.toString() === cartItem.colorStockId.toString()
        );

        if (colorStock) {
          // cartItem.stockStatus = colorStock.status;
          // cartItem.availableStock = colorStock.quantity;

          if(colorStock.quantity ===0) {
            cartItem.stockStatus = "Out of Stock";
            cartItem.statusColor = "text-danger";

          } else if(colorStock.quantity < 5) {
            cartItem.stockStatus = `${colorStock.quantity} left`
            cartItem.statusColor = "text-success";

          } else {
            cartItem.stockStatus = 'Available'
            cartItem.statusColor = "text-warning";

          }
        }
      
      if(cartItem.productId ?.isBlocked || !cartItem.productId?.category){
        cartItem.error = "This product is unavailable";


        await Cart.findByIdAndDelete(cartItem._id);
        return cartItem
      }

      return cartItem
      
      })
    )


   

    const filteredCartDetails = processedCartDetails.filter((item)=>!item.error)


    const totalAmount = filteredCartDetails.reduce((total, item)=>{
      return item.productId
      ? total +item.productId.salePrice * item.quantity: total;
    },0)


    const hasAvailableProducts = filteredCartDetails.some((item) => item.productId)

    

    res.render("cart", {
      cart: processedCartDetails,
      user: userDetails,
      totalAmount: totalAmount.toFixed(2),
      hasAvailableProducts
    });
  } catch (error) {
    console.error("Error loading cart:", error);
    res.status(500).render("error", {
      message: "An error occurred while loading the cart",
      userId: req.session.user,
    });
  }
};

//Add to Cart Functionality

const addToCart = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login to add items to cart",
      });
    }

    const userId = req.session.user;
    const { productId, quantity, colorStockId,origin,wishlistId} = req.body;
    
    const maxLimit = 5;

    const product = await Product.findById(productId)
    .populate({
      path:'category',
      match: {isListed:true}
    })
    .populate({
      path: 'brand',
      match: {isBlocked: false}
    });


    const isProductAvailable = product && product.category && product.brand && !product.isBlocked;


    if(!isProductAvailable) {
      return res.status(404).json({
        success: false,
        message: "Product is blocked by admin or unavailable "
      })
    }
    // if (!product || product.isBlocked) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Product is unavailable",
    //   });
    // }

   
    const colorStock = product.colorStock.id(colorStockId);
    if (!colorStock) {
      return res.status(404).json({
        success: false,
        message: "Color variant not found",
      });
    }



    if(colorStock.quantity <=0) {
      colorStock.status = "Out_of_Stock";
      await product.save();
      return res.status(400).json({success: false, message:"Product is out of stock"})

    } else if(colorStock.quantity <=5) {

      colorStock.status = "low_stock"
    } else {
      colorStock.status = "In_Stock"
    }

    if (quantity > colorStock.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${colorStock.quantity} items available in this color`,
      });
    }

    

    const existingCartItem = await Cart.findOne({
      userId,
      productId,
      colorStockId,
    });

    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + quantity;

      

      if (newQuantity > maxLimit) {
        return res.status(400).json({
          success: false,
          message: `Maximum limit of ${maxLimit} items exceeded`,
        });
      }

      if (newQuantity > colorStock.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more items. Only ${colorStock.quantity} available in this color`,
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
        remainingStock: colorStock.quantity - newQuantity,
        stockStatus: colorStock.status
      });


    } else {
      if (quantity > maxLimit) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more than ${maxLimit} items`,
        });
      }

      const newCartItem = new Cart({
        userId,
        productId,
        categoryId: product.category,
        colorStockId,
        quantity,
      });

      await newCartItem.save();

     
      
      const cartItemCount = await Cart.countDocuments({ userId });

      return res.status(200).json({
        success: true,
        message: "Product added to cart successfully!",
        cartItemCount,
        stockStatus: colorStock.status
        
      });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      errorDetails: error.message,
    });
  }
};


//Update the cart quantity:-
const updateCartQuantity = async(req,res)=>{

  const {cartItemId,quantity} = req.body;
 
  try {
    const userId = req.session.user
    const cartItem = await Cart.findOne({ userId: userId, productId: cartItemId })
    .populate({path:'productId',
      populate:{
        path:'colorStock'
      }
    });


    
  

    if(!cartItem || !cartItem.productId){
      return res.status(404).json({success:false,message:"Cart item or product not found"})
    }
   
    

    const product = cartItem.productId;
    const colorStock = product.colorStock.find(
      stock => stock._id.toString() === cartItem.colorStockId.toString()
    );

  


    if (quantity < 1 || quantity>5) {
      return res.status(400).json({ success: false, message: "Quantity must be between 1 and 5" });
  }

  if(!colorStock){
    return res.status(400).json({success:false,message:"Selected color is not available"})
  }


  if (colorStock.quantity <= 0) {
    colorStock.status = "Out_of_Stock";
    await product.save();
    return res.status(400).json({
        success: false,
        message: "Product is out of stock",
        stockStatus: "Out_of_Stock"
    });
} else if (colorStock.quantity <= 5) {
    colorStock.status = "low_stock";
} else {
    colorStock.status = "In_Stock";
}



    

    if (quantity > colorStock.quantity) {
        return res.status(400).json({ 
            success: false, 
            message: `Only ${colorStock.quantity} items available in stock for selected product`,
            availableStock: colorStock.quantity 
        });
    }



       cartItem.quantity = quantity;
       await cartItem.save();

       const cartItems = await Cart.find({ userId:userId }).populate('productId');
       const cartTotal = cartItems.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0);

       return res.status(200).json({
           success: true,
           cartTotal: cartTotal,
           newTotal: product.salePrice * quantity,
           message:"Cart updated successfully"
       });
    
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    return res.status(500).json({ success: false, message: 'Maximum Quantity Reached' });
  }
}




const deleteCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login to remove items from the cart",
      });
    }

    const userId = req.session.user;


    const { cartItemId } = req.body;
    

    if (!cartItemId) {
      return res.status(400).json({
        success: false,
        message: "Cart Item ID is required",
      });
    }

    const cartItem = await Cart.findOne({
      _id: new mongoose.Types.ObjectId(cartItemId),
      userId: userId,
    }).populate("productId");

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart Item not found",
      });
    }

   
    const productId = cartItem?.productId?._id;

    await Cart.findByIdAndDelete(cartItemId);
    const updateProduct = await Product.findById({ _id: productId }).populate('colorStock');
   

    const remainingCartItems = await Cart.find({
      userId: userId,
    }).populate("productId");

    const newTotalAmount = remainingCartItems.reduce((total, item) => {
      if (item.productId && !item.productId.isBlocked && item.productId.salePrice) {
        return total + item.productId.salePrice * item.quantity;
      }
      return total;
    }, 0);
    

    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      newTotalAmount: newTotalAmount.toFixed(2),
    });
  } catch (error) {
    console.error("Delete Cart Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errorDetails: error.message,
    });
  }
};

module.exports = {
  loadCart,
  addToCart,
  deleteCart,
  updateCartQuantity,
  
};

