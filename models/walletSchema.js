const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    walletBalance:{
        type:Number,
        required: true,
        min:0
    },


    transactions:[{

        orderId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Order'
        },

        transactionType:{
            type: String,
            enum:['debit','credit'],
            required: true

        },
        transactionAmount:{
            type: Number,
            required: true
        },
        transactionDate:{
            type:Date,
            default: Date.now
        },
        transactionId:{
            type:String,
            required: true
        },
        transactionDescription:{
            type: String,
            required: false
        }
    }]
},{timestamps:true});


const Wallet = mongoose.model('Wallet',walletSchema);
module.exports = Wallet;