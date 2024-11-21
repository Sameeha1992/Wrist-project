const mongoose = require("mongoose");
const {Schema} = mongoose;
const User = require("../models/userSchema");
const {payment,order } = require("../config/enum")



const orderSchema=new Schema({
    order_id:{
        type:mongoose.Types.ObjectId,
        required:true,
        ref:"Product"

    },
    user_id:{
        type:mongoose.Types.ObjectId,
        ref:"user",
        required:true
    },
    status:{
        type:String,
        enum:Object.values(order),
        default:order.PROCESSING
    },
    payment_type:{
        type:String,
        enum:Object.values(payment),
        required:true,
        default:payment.PENDING
    },
    payment_ref:{
        type:String
    },
    totalPrice:{
        type:Number,
        required:true
    },
    address:{
        type:Object,
        required:true
    },
    order_date:{
        type:Date,
        default:Date.now
    },
    delivered_date:{
        type:Date
    },
    return_date:{
        type:Date
    },

    items:[{
        product_id:{
            type:mongoose.Types.ObjectId,
            required:true,
            ref:"product"
        },
       
        quantity:{
            type:Number,
            required:true
        }
    }]
})



const Order = mongoose.model("Order",orderSchema);
module.exports=Order;



