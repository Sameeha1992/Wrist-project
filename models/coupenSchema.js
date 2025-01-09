const mongoose = require('mongoose');

const coupenSchema = new mongoose.Schema({

    code: {
        type: String,
        required:true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage','fixed'],
        required: false
    },
    minDiscountValue: {
        type: Number,
        required: true,
        min: 0
    },
    expiryDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default:1
    },
    usedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: false
    },
    conditions: {
        type: String,
        enum: ['minimum_purchase','first_purchase','no_condition'],
        
    },
    minPurchaseAmount:{
        type: Number,
        default: 0
    }
},{timestamps: true})


const Coupen = mongoose.model('Coupen',coupenSchema)

module.exports= Coupen;