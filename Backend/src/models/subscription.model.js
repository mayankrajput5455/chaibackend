import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // who is subscripting
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // whome subsriber is subscribing
        ref: "User"
    }
}, {})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)