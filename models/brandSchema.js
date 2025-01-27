const mongoose=require("mongoose");
const {Schema} = mongoose;

const brandSchema = new Schema({
     brandName:{
        type:String,
        required:true,
        unique:true,
        
     },
     brandImage:{
        type:[String],
        required:true
     },
     isBlocked:{
        type: Boolean,
        default:false,
        index: true,
     },
    
    
},{ timestamps: true })

const Brand= mongoose.model("Brand",brandSchema);

module.exports=Brand;