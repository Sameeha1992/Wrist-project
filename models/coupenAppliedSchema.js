const mongoose = require('mongoose');

const usedCoupenSchema = new mongoose.Schema({
    couponId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Coupen',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    redeemedAt:{
        type: Date,
        default: Date.now
    },
    orderId: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        rquired: true
    }
},{timestamps: true});

const AppliedCoupen = mongoose.model('UseCoupen',usedCoupenSchema);
module.exports=AppliedCoupen;