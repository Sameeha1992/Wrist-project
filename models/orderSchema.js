const mongoose = require("mongoose");
const {Schema} = mongoose;
const User = require("../models/userSchema");
const Product = require("../models/productSchema")




const orderSchema=new Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    orderItem:[
        {
            productId : {
                type : mongoose.Types.ObjectId,
                ref : 'Product',
                required : true,
            },
            quantity : {
                type : Number,
                required : true,
            },
            color:{
                type:String,
                required:true
            },
            price:{
                type:Number,

            },
            totalPrice:{
                type:Number
            },
            itemStatus: {
                type: String,
                enum: ['Processing', 'Delivered', 'Cancelled', 'Shipped'],
                default: 'Processing'
            }
        }
    ],
    shippingAddress:{
        type:String,
        required:true
    },
    zip:{
        type:String,
        required:true
    },
    country:{
        type: String,
        required: true
    },
    
    phone:{
        type: String,
        required: true
    },
    orderStatus:{
        type: String,
        enum:['Processing','Delivered','Cancelled','Shipped'],
        default:'Processing',
        required: true

    },
    paymentMethod:{
        type: String,
        enum: ['COD','Card payment','Wallet','UPI','Bank Transfer','Razorpay'],
        required: true
    },
    totalAmount:{
        type: Number,
        
    },
    couponDiscount : {
        type : Number
    },
    discount : {
        type : Number,
    },
    coupon : {
        type : String,
    },
    backupTotalAmount : {
        type : Number,
    }


},{timestamps:true});


const Order = mongoose.model("Order",orderSchema);
module.exports=Order;



