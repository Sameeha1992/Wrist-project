const mongoose = require("mongoose");
const {Schema} = mongoose;

const colorStockSchema = new mongoose.Schema({
    color:{
        type:String,
        enum:["red","blue","white","black","silver","golden","pink"],
        required:true
    },
    quantity:{
        type:Number,
        required:true,
        min:0
    },
    status:{
        type:String,
        enum:["Available","Out of Stock","Discontinued"],
        required:true,
        default:"Available"

    }
})

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
        type:Schema.Types.ObjectId,
        ref:"Brand",
        required:true
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
        required:false,
        default:null
    },
    productOffer:{
        type:Number,
        default:0
    },
   colorStock:[colorStockSchema],
    
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    
   
},{timestamps:true});

const Product= mongoose.model("Product",productSchema);
module.exports=Product;