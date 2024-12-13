const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
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
        select: "productName salePrice productImage colorStock isBlocked",
      })
      .populate({
        path: "categoryId",
        select: "name",
      });

     

    const processedCartDetails = cartDetails.map((item) => {
      const cartItem = item.toObject();

    

      if (!cartItem.productId || cartItem.productId.isBlocked) {
        cartItem.error = "Product is unavailable";
        return cartItem;
      }

      cartItem.quantity = Math.min(cartItem.quantity,5);
      console.log(cartItem.quantity,"CART ITEM QUANTITY")

      return cartItem;
    });


    
    const totalAmount = processedCartDetails.reduce((total, item) => {
      return item.productId && !item.productId.isBlocked
        ? total + item.productId.salePrice * item.quantity
        : total;
    }, 0);

    res.render("cart", {
      cart: processedCartDetails,
      user: userDetails,
      totalAmount: totalAmount.toFixed(2),
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
    const { productId, quantity, colorStockId } = req.body;
    const maxLimit = 5;

    const product = await Product.findById(productId);
    if (!product || product.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "Product is unavailable",
      });
    }

    const colorStock = product.colorStock.id(colorStockId);
    console.log(colorStock,"Colorstockkkkk")
    if (!colorStock) {
      return res.status(404).json({
        success: false,
        message: "Color variant not found",
      });
    }

    if (quantity > colorStock.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${colorStock.quantity} items available in this color`,
      });
    }

    console.log(quantity, "Quantity");
    console.log(colorStock.quantity, "COLORSTOCK QUNATITY");

    const existingCartItem = await Cart.findOne({
      userId,
      productId,
      colorStockId,
    });

    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + quantity;

      console.log(newQuantity, "newqauntity");
      console.log(newQuantity > maxLimit, "newQuantity > maxLimit");

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

     
      console.log(product, "product");

      const cartItemCount = await Cart.countDocuments({ userId });

      return res.status(200).json({
        success: true,
        message: "Product added to cart successfully!",
        cartItemCount,
        
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

const updateCartQuantity = async(req,res)=>{

  const {cartItemId,quantity} = req.body;
 
  try {
    const cartItem = await Cart.findOne({productId: cartItemId});
   
    

    if(!cartItem){
      return res.status(404).json({success:false,message:"Cart item not found"})
    }

    const product = await Product.findById(cartItem.productId);
    console.log(product,"PRODUCT")

    if(!product){
      return res.status(404).json({success: false,message:"Product not found"})

    }

    if(quantity>5){
      return res.status(400).json({success:false,message:"You can only have a maximum of 5 items"})
    }
       cartItem.quantity = quantity;
       await cartItem.save();

   const newTotal = quantity *product.salePrice;

   const cartItems = await Cart.find({userId: cartItem.userId});
   const productPrices = await Promise.all(cartItems.map(async (item) => {
    const product = await Product.findById(item.productId);
    return product.price * item.quantity; // Calculate total for this item
  }));

  const cartTotal = productPrices.reduce((total, itemTotal) => total + itemTotal, 0);

  return res.status(200).json({success:true,newTotal,cartTotal})
    
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while updating the cart quantity.' });
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

    const cartQuantity = cartItem?.quantity;
    const productId = cartItem?.productId?._id;

    await Cart.findByIdAndDelete(cartItemId);
    const updateProduct = await Product.findById({ _id: productId }).populate('colorStock');
   

    const remainingCartItems = await Cart.find({
      userId: userId,
    }).populate("productId");

    const newTotalAmount = remainingCartItems.reduce(
      (total, item) => total + item.productId.salePrice * item.quantity,
      0
    );

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

