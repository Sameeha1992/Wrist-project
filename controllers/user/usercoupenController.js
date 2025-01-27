const Coupen = require('../../models/coupenSchema');
const AppliedCoupen = require('../../models/coupenAppliedSchema');
const Order = require("../../models/orderSchema");



const coupenApply = async(req,res)=>{
   
    const {couponCode,subTotal,userId} = req.body;

  

    try {


        if (!userId) {
            return res.status(401).json({ message: "Please login to apply coupon" });
        }

        if (!couponCode || !subTotal) {
            return res.status(400).json({ message: "Missing required fields" });
        }


        const coupon = await Coupen.findOne({code:couponCode});
        

        if(!coupon){
            return res.status(404).json({message:"Coupen in invalid"})
        }


        if(!coupon.isActive || new Date()> coupon.expiryDate) {
            return res.status(400).json({message:"Coupon is expired or inactive"})
        }



        if(coupon.usedCount >= coupon.usageLimit){
            return res.status(400).json({message:"Coupon usage limit exceeded"})
        }


    
        const userCouponUsage = await AppliedCoupen.findOne({
            userId: userId,
            couponId:coupon._id
        })

        

        if(userCouponUsage){
            return res.status(400).json({message:"Coupen already used...!"})
        }    
        
        let discountAmount =0;

            if(coupon.discountType==='fixed'){

                discountAmount= coupon.minDiscountValue;

               
               
            }
            discountAmount = Math.min(discountAmount,subTotal)
           

            if(coupon.conditions ==='minimum_purchase' && subTotal < coupon.minPurchaseAmount) {
                return res.status(400).json({
                    message:`Minimum purchase amount of ₹ ${coupon.minPurchaseAmount} required`
                })
            } else if(coupon.conditions === 'first_purchase'){
                const previousOrders = await Order.findOne({userId});

                if(previousOrders) {
                    return res.status(400).json({
                        message: `This coupon is valid only for the first time purchase`
                    })
                }
            }

            const grandTotal = subTotal - discountAmount;
         

            req.session.couponData = { couponCode, discountAmount,subTotal}
           

            res.status(200).json({
                success: true,
                message:'Coupen applied successfully',  
                discountAmount,
                grandTotal,
                couponId: coupon._id,
                couponsCode: coupon.code
                
            })
        
        
    } catch (error) {
        console.error('Error applying coupon',error);
        res.status(500).json({
            success: false,
            message:'Internal server error',
            error: error.message
        })
    }
}



const removeCoupon = async(req,res)=>{

    const {couponsCode} = req.body;
    console.log(req.body)
    try {
    req.session.couponData = null;
        
        res.status(200).json({message:"Coupon removed successfully"})
    } catch (error) {
        console.error('Error removing coupon',error)
        
    }
}

module.exports={
    coupenApply,
    removeCoupon,
}


