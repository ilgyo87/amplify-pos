import { a, defineData, type ClientSchema } from "@aws-amplify/backend";

const schema = a.schema({

  // Custom Types
  Location: a.customType({
    lat: a.float(),
    long: a.float(),
  }),
  // Core Business Entity
  Business: a
    .model({
      businessName: a.string().required(),
      firstName: a.string(),
      lastName: a.string(),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      zipCode: a.string(),
      phone: a.phone().required(),
      coordinates: a.ref('Location'),
      email: a.email().required(),
      website: a.url(),
      hours: a.string().array(),
      logoUrl: a.url(),
      logoSource: a.string(),
      userId: a.string(),
      orders: a.hasMany('Order', 'businessId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner(),
    ]),
  Customer: a
    .model({
      firstName: a.string().required(),
      lastName: a.string().required(),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      zipCode: a.string(),
      phone: a.phone().required(),
      coordinates: a.ref('Location'),
      email: a.email(),
      businessId: a.string(),
      cognitoId: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner(),
    ]),
  Order: a
    .model({
      businessId: a.string().required(),
      business: a.belongsTo('Business', 'businessId'),
      customerId: a.string().required(),
      employeeId: a.string().required(),
      items: a.hasMany('OrderItem', 'orderId'),
      paymentMethod: a.string().required(),
      total: a.float().required(),
      status: a.string().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner(),
    ]),
  OrderItem: a
    .model({
      name: a.string().required(),
      description: a.string(),
      price: a.float(),
      discount: a.float(),
      category: a.string(),
      businessId: a.string(),
      customerId: a.string(),
      employeeId: a.string(),
      orderId: a.string(),
      orderIdHistory: a.string().array(),
      starch: a.enum(['none', 'light', 'medium', 'heavy']),
      pressOnly: a.boolean(),
      notes: a.string().array(), // <-- Added this line for notes
      order: a.belongsTo('Order', 'orderId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner(),
    ]),
  Employee: a
    .model({
      firstName: a.string().required(),
      lastName: a.string().required(),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      zipCode: a.string(),
      phone: a.phone().required(),
      coordinates: a.ref('Location'),
      email: a.email(),
      businessId: a.string(),
      cognitoId: a.string(),
      pin: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner(),
    ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool"
  }
});