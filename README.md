# Shopify Order Attribution Webhook Service

This project is a Node.js/Express backend that receives Shopify order-create webhooks, validates the merchant context, attributes the order to the latest WhatsApp broadcast, and stores the attributed order in PostgreSQL.

## Overview

The current implementation focuses on one webhook flow:

- Receive Shopify order data at POST /webhooks/shopify/order
- Resolve the merchant from the Shopify shop domain header
- Prevent duplicate order processing using the Shopify order ID
- Extract customer details from the payload
- Find the latest broadcast for the merchant
- Match the customer phone number against contacts that clicked that broadcast
- Persist the order and increment the broadcast's attributed revenue

## API Endpoint

### POST /webhooks/shopify/order

This endpoint expects a Shopify order payload and the shop domain in the request headers.

#### Required headers

- x-shopify-shop-domain: Shopify store domain
- or shopify-shop-domain: Shopify store domain

#### Example

```bash
curl -X POST http://localhost:3000/webhooks/shopify/order \
  -H "Content-Type: application/json" \
  -H "x-shopify-shop-domain: my-shop.myshopify.com" \
  -d '{"id": 12345, "name": "#1001", "customer": {"first_name": "John", "last_name": "Doe", "email": "john@example.com", "phone": "+91 98765-43210"}, "line_items": [{"quantity": 2}], "currency": "INR", "total_price": "1299.00", "gateway": "COD", "financial_status": "pending", "fulfillment_status": "unfulfilled", "created_at": "2026-08-09T10:00:00Z"}'
```

## How the webhook flow works

1. The controller validates that a Shopify shop domain is present.
2. The merchant is looked up using the shop domain.
3. The service checks whether the Shopify order ID already exists.
4. Customer data is extracted from the payload.
5. The latest broadcast for the merchant is fetched.
6. The customer phone is normalized and matched with contacts that clicked the broadcast.
7. If attribution passes, the order is created and the broadcast's attributed revenue is updated.

## Business rules

An order is stored only when all of the following are true:

- A merchant exists for the shop domain
- The Shopify order ID is not already present
- The customer has a phone number
- The merchant has a latest broadcast
- The customer phone matches a clicked contact from that broadcast

If any of these checks fail, the webhook processing stops.

## Phone number handling

Phone numbers are normalized before comparison using:

```js
phone.replace(/\D/g, "").slice(-10)
```

This means values like:

- +91 98765-43210
- 9876543210
- 98765 43210

are treated as the same normalized number.

## Current implementation details

### Service responsibilities

- normalize phone numbers
- extract customer phone, name, and email
- calculate total quantity from line items
- detect COD-style payments based on gateway or financial status
- build the order object for persistence
- prevent duplicate orders
- update broadcast attribution revenue

### Database operations

The service interacts with these query modules:

- orders queries: create order, fetch by Shopify ID, fetch by user/contact
- broadcast queries: fetch latest broadcast, add attributed revenue
- clicks queries: fetch clicked contacts with phone numbers

## Project structure

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

## Setup

### Install dependencies

```bash
npm install
```

### Environment variables

Create a .env file with your PostgreSQL connection details:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SSL=false
```

### Start the server

```bash
npm run dev
```

The app will start on the port defined in the server entry file.

## Tech stack

- Node.js
- Express.js
- PostgreSQL
- Shopify webhooks
- pg

## Notes

- The current codebase wires the order webhook route under /webhooks/shopify/order.
- The webhook verification middleware exists in the project but is not currently part of the active webhook processing flow.
- The service is currently designed around merchant-to-broadcast attribution based on contact clicks and normalized phone matching.
