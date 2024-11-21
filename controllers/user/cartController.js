const User=require("../../models/userSchema");
const Cart = require("../../models/cartSchema");



const loadCart = async(req,res)=>{
    try {
        const cartData = await Cart.findOne({
            userId:req.session.user_id,
        }).populate("items.productId");
        console.log("Cart data:",cartData)
        res.render("cart",{user:req.session.user_id,cart:cartData || {items: [],cartSubtotal:0,totalAmount:0}})
        
    } catch (error) {
    console.log(error.message);
    res.render('404',{user:req.session.user_id})
        
    }
};




const addtoCart = async (req, res) => {
    try {
      console.log("hi im addtocart")
      console.log(req.body)
      const { productId, color, price, quantity = 1 } = req.body; // Default quantity to 1 if not provided
      const userId = req.session.user;
  
      // Validate user session
      if (!userId) {
        return res.json({ success: false, message: "User not logged in." });
      }
  
      // Fetch the product
      const product = await Product.findById(productId);
      if (!product) {
        return res.json({ success: false, message: "Product not found." });
      }
  
      // Check stock availability
      if (product.quantity < quantity) {
        return res.json({
          success: false,
          message: `Insufficient stock. Only ${product.quantity} items left.`,
        });
      }
  
      // Find the user's cart
      let cart = await Cart.findOne({ userId });
      const itemObj = {
        color : color,
        quantity : quantity,
      }
      if (!cart) {
        // If cart doesn't exist, create a new one
        cart = new Cart({
          userId,
          categoryId: product.category, // Assuming `product.category` is the category ID
          productId,
          items : [itemObj]
        });
      }
  
      // Check if the product with the specific color already exists in the cart
      const existingItemIndex = cart.items.findIndex(
        (item) => item.color === color && cart.productId.toString() === productId
      );
  
      if (existingItemIndex !== -1) {
        const existingItem = cart.items[existingItemIndex];
  
        // Ensure the quantity does not exceed the max limit of 5
        if (existingItem.quantity + quantity > 5) {
          return res.json({
            success: false,
            message: `You can only add up to 5 of this product to the cart.`,
          });
        }
  
        // Update the quantity and stock
        existingItem.quantity += quantity;
      } else {
        // Add a new item to the cart
        cart.items.push({
          color,
          quantity,
        });
      }
  
      // Update product stock
      product.quantity -= quantity;
  
      // Save the cart and product changes
      await Promise.all([cart.save(), product.save()]);
  
      res.json({
        success: true,
        message: "Product added to cart successfully.",
        cart,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
    }
  };
  
  





module.exports={
    loadCart,
    addtoCart,
}