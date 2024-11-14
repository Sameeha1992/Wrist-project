const mongoose=require("mongoose")
const {Schema} = mongoose;
const bcrypt = require("bcrypt")

const userSchema=new Schema({
    name: {
        type:String,
        required:true,
    },

    email:{
        type:String,
        required:true,
        unique:false,
    },

    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },

    googleId:{
        type:String,
        unique:false,
        
    },
    password:{
        type:String,
        required:false
    },
    newpassword:{
        type:String,
        required:false
    },

    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin: {
        type:Boolean,
        default:false
    },

    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart",
    }],

    wallet:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
       orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now,
    },
    referalCode:{
        type:String,
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User",
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String,

        },
        searchOn:{
            type:Date,
            default:Date.now
        }

    }]


   

});

userSchema.methods.verifyPassword = async function(password){
    return await bcrypt.compare(password,this.password)
};

const User = mongoose.model("User",userSchema);
module.exports=User;





