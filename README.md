# Shopify Order Attribution Webhook

A backend service that receives Shopify orders/create webhooks, attributes orders to the latest WhatsApp broadcast, stores attributed orders, and updates campaign revenue analytics.

## 🚀 Features

- Receives Shopify orders/create webhooks
- Prevents duplicate order processing
- Extracts customer information from the webhook payload
- Finds the merchant using the Shopify shop domain
- Retrieves the merchant's latest broadcast
- Matches the customer phone number against clicked broadcast contacts
- Attributes orders to WhatsApp campaigns
- Stores only attributed orders
- Updates campaign attributed revenue automatically
- Normalizes phone numbers before comparison

## 📂 Project Structure

```text
src/
├── app.js
├── server.js
├── config/
│   └── db.js
├── controllers/
│   └── webhook.controller.js
├── middleware/
│   └── verifyWebhook.js
├── queries/
│   ├── broadcast.queries.js
│   ├── clicks.queries.js
│   ├── merchant.queries.js
│   └── orders.queries.js
├── routes/
│   └── webhook.routes.js
├── schema/
│   ├── broadcasts.js
│   ├── clicks.js
│   ├── contacts.js
│   ├── messages.js
│   └── orders.js
└── services/
    └── webhook.service.js
```

## 🔄 Workflow

The project workflow is documented in the attached PDF reference file: [webhook_workflow.pdf](webhook_workflow.pdf).

For implementation reference, the flow follows this sequence:

```text
Shopify
  │
  ▼
POST /webhooks/orders/create
  │
  ▼
handleOrderWebhook()
  │
  ▼
Find Merchant
  │
  ▼
processOrderWebhook()
  │
  ▼
Duplicate Order Check
  │
  ▼
Customer Phone Validation
  │
  ▼
Latest Broadcast Lookup
  │
  ▼
Broadcast Attribution
  │
  ▼
Build Order Object
  │
  ▼
Store Order
  │
  ▼
Update Attributed Revenue
```

## 📋 Order Attribution Logic

An order is stored only if all of the following conditions are satisfied:

- The merchant exists
- The order is not a duplicate
- The customer phone number exists
- The merchant has a latest broadcast
- The customer clicked the latest broadcast
- The customer phone matches a clicked contact

If any of these checks fail, the webhook processing stops.

## 📞 Phone Number Matching

Phone numbers are normalized before comparison using:

```js
phone.replace(/\D/g, "").slice(-10)
```

Example:

```text
+91 98765-43210
9876543210
98765 43210
```

All become:

```text
9876543210
```

## 🧩 Helper Functions

| Function | Responsibility |
|----------|----------------|
| getCustomerPhone() | Extracts the customer phone number from the payload |
| getCustomerName() | Builds the customer full name |
| getCustomerEmail() | Extracts the customer email |
| getLatestBroadcastOrThrow() | Fetches the latest broadcast or throws an error |
| verifyCustomerFromBroadcast() | Matches the customer phone with clicked contacts |
| getAttribution() | Validates attribution before order storage |
| getTotalQuantity() | Calculates total quantity from line items |
| getIsCod() | Determines whether the order is COD-based |

## 🛡 Edge Cases Handled in the Service Layer

| Edge case | Where it is handled | Result |
|----------|---------------------|--------|
| Duplicate Shopify order ID | services/webhook.service.js | The webhook is skipped and the existing order is returned as a duplicate |
| Missing customer phone number | getCustomerPhone() | Throws an error and stops processing |
| Merchant has no latest broadcast | getLatestBroadcastOrThrow() | Throws an error and prevents order creation |
| Customer phone does not match any clicked contact | verifyCustomerFromBroadcast() | Throws an error and prevents attribution |
| Broadcast ID or customer phone is missing during verification | verifyCustomerFromBroadcast() | Returns early with no match |
| Customer has formatted phone numbers with spaces, symbols, or country codes | normalizePhone() | Normalizes the value and compares safely |
| Order has no line items or empty quantity data | getTotalQuantity() | Returns 0 instead of failing |
| Payment gateway is COD or financial status is pending | getIsCod() | Marks the order as COD |
| Customer email is not provided | getCustomerEmail() | Returns null without breaking the flow |
| Missing or invalid Shopify shop domain in the request header | controllers/webhook.controller.js | Returns a 400 response |
| Merchant is not found for the shop domain | controllers/webhook.controller.js | Returns a 404 response |

## 📦 Database Operations

### Orders

- Prevent duplicate orders
- Insert attributed orders

### Broadcasts

- Fetch the latest broadcast
- Update attributed revenue

### Clicks

- Retrieve clicked contacts
- Compare phone numbers

## 🧠 Technologies

- Node.js
- Express.js
- PostgreSQL
- Shopify Webhooks
- REST API

## ✅ Current Functionality

- Duplicate protection
- Broadcast attribution
- Revenue tracking
- Phone number normalization
- Campaign analytics
- Order persistence

## 👨‍💻 Author

Jayesh Sharma
