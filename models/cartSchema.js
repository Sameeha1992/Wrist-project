const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "Users", 
      },
    

      productId: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: "Product", 
          },
        
          categoryId:{
              type : mongoose.Types.ObjectId,
              required : true,
              ref : "Category",
          },
          quantity: {
            type: Number,
            required: true,
            min: 0, 
            max: 5, 
          },
        },
    
    { timestamps: true }
  );

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
