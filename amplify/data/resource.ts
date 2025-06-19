import { a, defineData, type ClientSchema } from "@aws-amplify/backend";
// Schema updated to include all sync fields

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
      taxRate: a.float(),
      currency: a.string(),
      timezone: a.string(),
      isActive: a.boolean().default(true),
      logo: a.string(),
      settings: a.string(),
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
      emailNotifications: a.boolean(),
      textNotifications: a.boolean(),
      totalRefunds: a.float(),
      notes: a.string(),
      joinDate: a.string(),
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
      orderNumber: a.string(),
      customerName: a.string(),
      customerPhone: a.string(),
      employeeName: a.string(),
      subtotal: a.float(),
      tax: a.float(),
      total: a.float().required(),
      paymentMethod: a.string().required(),
      paymentInfo: a.string(), // JSON string of payment details
      selectedDate: a.string(),
      status: a.string().required(),
      statusHistory: a.string(), // JSON string of status history array
      notes: a.string(),
      barcodeData: a.string(),
      rackNumber: a.string(),
      cancellationReason: a.string(),
      refundAmount: a.float(),
      refundDate: a.string(),
      customerEmail: a.email(),
      paymentStatus: a.string(),
      cardLast4: a.string(),
      checkNumber: a.string(),
      accountId: a.string(),
      stripePaymentIntentId: a.string(),
      stripeChargeId: a.string(),
      refundReason: a.string(),
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
      role: a.string(),
      isActive: a.boolean().default(true),
      permissions: a.string().array(),
      amplifyId: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner(),
    ]),
  Category: a
    .model({
      name: a.string().required(),
      description: a.string(),
      color: a.string(),
      displayOrder: a.integer(),
      isActive: a.boolean().default(true),
      businessId: a.string(),
      sortOrder: a.integer(),
      image: a.string(),
      icon: a.string(),
      products: a.hasMany('Product', 'categoryId')
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner(),
    ]),
  Product: a
    .model({
      name: a.string().required(),
      description: a.string(),
      price: a.float().required(),
      sku: a.string(),
      barcode: a.string(),
      categoryId: a.string(),
      category: a.belongsTo('Category', 'categoryId'),
      imageUrl: a.url(),
      imageName: a.string(), // For static asset references
      isActive: a.boolean().default(true),
      businessId: a.string(),
      cost: a.float(),
      quantity: a.integer(),
      image: a.string(),
      trackInventory: a.boolean(),
      inventoryCount: a.integer(),
      lowStockThreshold: a.integer(),
      variants: a.string(),
      customizations: a.string(),
      displayOrder: a.integer()
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner(),
    ]),
  StripeToken: a
    .model({
      userId: a.string().required(), // This will be the Cognito User ID or other unique user identifier
      accessToken: a.string().required(),
      stripeUserId: a.string().required(), // The Stripe Account ID (acct_...)
    })
    .identifier(["userId"])
    .authorization((allow) => [
      allow.ownerDefinedIn("userId") // Allow owner to manage their token. Backend function access will be granted via IAM policies.
    ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool"
  }
});