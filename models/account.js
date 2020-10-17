const mongoose = require("mongoose");
const passportLocalMongoose = require ('passport-local-mongoose');
const validator=require("validator");


const accountSchema = mongoose.Schema( 
{
  country: String,
  firstName: {type:String,required:true},
  lastName: {type:String,required:true},
  email: { type:String,
  validate(value){
    if(!validator.isEmail(value)){
      throw new Error("Email is not valid !");
    }}
  },
  password: {type:String,required:true,min:[8,"should be 8 characters"]},
  address: {type:String,required:[true,"Address Required"]}, 
  city: {type:String,required:[true,"City Required"]},
  state: {type:String,required:[true,"State Required"]}, 
  zip: Number,
  mobile:{type:String,
  validate: {
    validator: function(v) {
      return /\d{3}-\d{3}-\d{4}/.test(v);
    },
    message: props => `${props.value} is not a valid phone number!`
  },
}
},
{timestamps : true},

);

accountSchema.plugin(passportLocalMongoose);


module.exports  =  mongoose.model("account", accountSchema);