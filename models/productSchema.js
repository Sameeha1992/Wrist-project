const mongoose = require("mongoose");
const {Schema} = mongoose;

const colorStockSchema = new mongoose.Schema({
    color:{
        type:String,
        enum:["red","blue","white","black","silver","golden","pink"],
        
        
    },
    quantity:{
        type:Number,
        required:true,
        min:0
    },
    status:{
        type:String,
        enum:["Available","low_stock","Out_of_Stock","Discontinued"],
        
        default:"Available"

    }
});


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
        required:true,
        index:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true,
        index:true
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
        default:false,
        index:true
    },
    
   
},{timestamps:true});

const Product= mongoose.model("Product",productSchema);
module.exports=Product;