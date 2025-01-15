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
                enum: ['Processing', 'Delivered', 'Cancelled', 'Shipped','Return_request','Returned'],
                default: 'Processing'
            },
            returnRequest:{
                type:String,
                enum:['Pending','Approved','Rejected'],
                default:'Pending',
            },
            returnStatus: {
                type: Boolean,
                default: false

            },
            returnReason:{
                type: String,
            },
            returnComments:{
                type: String
            },
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
        enum:['Processing','Delivered','Cancelled','Shipped','Failed','Full Order Returned'],
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
    paymentStatus:{
         type:String,
         enum:['Pending','Completed','Failed'],
         default:'Pending'
    },
    totalDiscount:{
       type: Number
    },
    couponDiscount:{
        type:Number,
    },
    appliedCouponCode : {
        type : String,
        required:false
    },
    cancelReason:{
        type:String,
        required:false
    }


},{timestamps:true});


const Order = mongoose.model("Order",orderSchema);
module.exports=Order;



