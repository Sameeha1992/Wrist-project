const mongoose = require("mongoose");
const {Schema} = mongoose;

const productSchema = new Schema({
   
    productName:{
        type: String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    brand:{
        type:String,
        required:true,
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer:{
        type:Number,
        default:0
    },
   
    
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","out of stock","Discontinued"],
        required:true,
        default:"Available"
    },
    quantity:{
        type:Number,
        required:true,
        default:0,
    }
},{timestamp:true});

const Product= mongoose.model("Product",productSchema);
module.exports=Product;