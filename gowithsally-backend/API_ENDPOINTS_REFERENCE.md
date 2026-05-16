# GoWithSally - Complete API Endpoints Reference

## Quick Navigation

- [Scheduled Rides](#scheduled-rides)
- [Favorites](#favorites)
- [Emergency Contacts](#emergency-contacts)
- [Reviews](#reviews)
- [Promotions](#promotions)
- [Wallet](#wallet)
- [Subscriptions](#subscriptions)
- [Insurance](#insurance)
- [Earnings](#earnings)
- [Vehicles](#vehicles)
- [Surge Pricing](#surge-pricing)
- [Support](#support)
- [FAQ](#faq)
- [Settings](#settings)
- [Zones](#zones)
- [Loyalty](#loyalty)
- [Referrals](#referrals)
- [Training](#training)
- [Feedback](#feedback)
- [Lost & Found](#lost--found)

---

## Scheduled Rides
**Base URL:** `/api/scheduled-rides`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Create scheduled ride |
| GET | `/` | ✅ | Get all scheduled rides |
| GET | `/:id` | ✅ | Get specific scheduled ride |
| PUT | `/:id` | ✅ | Update scheduled ride |
| DELETE | `/:id` | ✅ | Cancel scheduled ride |
| POST | `/:id/book` | ✅ | Book instance of scheduled ride |

---

## Favorites
**Base URL:** `/api/favorites`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Add favorite place |
| GET | `/` | ✅ | Get all favorites |
| GET | `/:id` | ✅ | Get specific favorite |
| PUT | `/:id` | ✅ | Update favorite |
| DELETE | `/:id` | ✅ | Remove favorite |

---

## Emergency Contacts
**Base URL:** `/api/emergency-contacts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Add emergency contact |
| GET | `/` | ✅ | Get all contacts |
| GET | `/primary` | ✅ | Get primary contact |
| PUT | `/:id` | ✅ | Update contact |
| DELETE | `/:id` | ✅ | Remove contact |
| POST | `/:id/sos` | ✅ | Send SOS alert |

---

## Reviews
**Base URL:** `/api/reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Create review |
| GET | `/:userId` | ❌ | Get user reviews |
| GET | `/ride/:rideId` | ❌ | Get ride review |
| PUT | `/:id` | ✅ | Update review |
| DELETE | `/:id` | ✅ | Delete review |

---

## Promotions
**Base URL:** `/api/promotions`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/available` | ❌ | Get available promotions |
| POST | `/validate` | ✅ | Validate coupon code |
| POST | `/apply` | ✅ | Apply code to ride |
| POST | `/` | ✅👮 | Create promotion (Admin) |
| GET | `/` | ✅👮 | Get all promotions (Admin) |

---

## Wallet
**Base URL:** `/api/wallet`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get wallet balance |
| GET | `/history` | ✅ | Get transaction history |
| POST | `/topup` | ✅ | Add funds |
| POST | `/withdraw` | ✅ | Withdraw funds |

---

## Subscriptions
**Base URL:** `/api/subscriptions`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/plans` | ❌ | Get available plans |
| GET | `/current` | ✅ | Get current subscription |
| POST | `/upgrade` | ✅ | Upgrade plan |
| POST | `/cancel` | ✅ | Cancel subscription |

---

## Insurance
**Base URL:** `/api/insurance`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/plans` | ❌ | Get insurance plans |
| POST | `/activate` | ✅ | Activate insurance |
| GET | `/:rideId` | ✅ | Get ride insurance |
| POST | `/:id/claim` | ✅ | File claim |

---

## Earnings
**Base URL:** `/api/earnings`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/daily` | ✅ | Get daily earnings |
| GET | `/weekly` | ✅ | Get weekly earnings |
| GET | `/monthly` | ✅ | Get monthly earnings |
| GET | `/breakdown` | ✅ | Get detailed breakdown |

---

## Vehicles
**Base URL:** `/api/vehicles`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Add vehicle |
| GET | `/` | ✅ | Get all vehicles |
| GET | `/:id` | ✅ | Get vehicle details |
| PUT | `/:id` | ✅ | Update vehicle |
| DELETE | `/:id` | ✅ | Remove vehicle |
| POST | `/:id/inspection` | ✅ | Record inspection |

---

## Surge Pricing
**Base URL:** `/api/surge`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/current` | ❌ | Get current multiplier |
| POST | `/` | ✅👮 | Create surge zone (Admin) |
| GET | `/` | ✅👮 | Get all surge zones (Admin) |
| PUT | `/:id` | ✅👮 | Update zone (Admin) |
| DELETE | `/:id` | ✅👮 | Disable zone (Admin) |

---

## Support
**Base URL:** `/api/support`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Create support ticket |
| GET | `/` | ✅ | Get user's tickets |
| GET | `/:id` | ✅ | Get ticket details |
| POST | `/:id/message` | ✅ | Add message to ticket |
| PUT | `/:id` | ✅👮 | Update ticket (Admin) |

---

## FAQ
**Base URL:** `/api/faq`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get FAQs (with search/filter) |
| GET | `/categories` | ❌ | Get categories |
| GET | `/:id` | ❌ | Get FAQ (increments views) |
| POST | `/:id/vote` | ✅ | Vote helpful/unhelpful |
| POST | `/` | ✅👮 | Create FAQ (Admin) |
| PUT | `/:id` | ✅👮 | Update FAQ (Admin) |

---

## Settings
**Base URL:** `/api/settings`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get user settings |
| PUT | `/` | ✅ | Update all settings |
| PUT | `/notifications` | ✅ | Update notifications |
| PUT | `/privacy` | ✅ | Update privacy settings |
| PUT | `/safety` | ✅ | Update safety settings |

---

## Zones
**Base URL:** `/api/zones`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get all zones |
| GET | `/check` | ❌ | Check if in service area |
| GET | `/:id` | ❌ | Get zone details |
| POST | `/` | ✅👮 | Create zone (Admin) |
| PUT | `/:id` | ✅👮 | Update zone (Admin) |
| DELETE | `/:id` | ✅👮 | Delete zone (Admin) |

---

## Loyalty
**Base URL:** `/api/loyalty`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | ✅ | Get loyalty profile |
| GET | `/history` | ✅ | Get points history |
| GET | `/rewards` | ❌ | Get available rewards |
| POST | `/redeem` | ✅ | Redeem points |
| POST | `/add-points` | ✅ | Add points (Admin) |

---

## Referrals
**Base URL:** `/api/referrals`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/code` | ✅ | Get referral code |
| POST | `/use` | ✅ | Use referral code |
| GET | `/stats` | ✅ | Get referral stats |
| POST | `/claim` | ✅ | Claim rewards |

---

## Training
**Base URL:** `/api/training`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/modules` | ❌ | Get available modules |
| GET | `/progress` | ✅ | Get progress |
| POST | `/complete-module` | ✅ | Complete module |
| GET | `/certifications` | ✅ | Get certifications |

---

## Feedback
**Base URL:** `/api/feedback`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Submit feedback |
| GET | `/:rideId` | ❌ | Get ride feedback |
| GET | `/user/sentiments` | ✅ | Get sentiment analysis |
| GET | `/surveys` | ✅ | Get pending surveys |

---

## Lost & Found
**Base URL:** `/api/lost-found`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/report` | ✅ | Report lost/found item |
| GET | `/` | ✅ | Get user's reports |
| GET | `/available` | ❌ | Get available items |
| GET | `/:id` | ❌ | Get item details |
| POST | `/:id/claim` | ✅ | Claim item |
| PUT | `/:id/return` | ✅ | Confirm return |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Authentication required |
| ✅👮 | Authentication + Admin required |
| ❌ | Public endpoint |

---

## Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Filtering
```
?status=active
?category=safety
```

### Search
```
?search=search_term
```

### Sorting
```
?sort=-createdAt
?sort=name
```

---

## Request/Response Examples

### Create Scheduled Ride
```bash
POST /api/scheduled-rides
Content-Type: application/json
Authorization: Bearer <token>

{
  "pickupLocation": {
    "address": "123 Main St",
    "coordinates": {
      "type": "Point",
      "coordinates": [-7.9898, 32.7595]
    }
  },
  "dropoffLocation": {
    "address": "456 Oak Ave",
    "coordinates": {
      "type": "Point",
      "coordinates": [-7.9891, 32.7589]
    }
  },
  "scheduledDateTime": "2024-03-20T09:00:00Z",
  "preferences": {
    "serviceType": "standard",
    "allowSharing": false
  }
}

Response:
{
  "success": true,
  "message": "Trajet planifié créé",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "status": "scheduled",
    "createdAt": "2024-03-17T10:30:00Z"
  }
}
```

### Get Wallet Balance
```bash
GET /api/wallet
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "balance": 1500.50,
    "currency": "MAD",
    "totalEarnings": 5000,
    "totalSpent": 3499.50
  }
}
```

### Apply Promotion Code
```bash
POST /api/promotions/apply
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "SUMMER50",
  "rideAmount": 200
}

Response:
{
  "success": true,
  "message": "Code appliqué",
  "data": {
    "discount": 50,
    "finalAmount": 150
  }
}
```

---

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET successful |
| 201 | Created | POST successful |
| 400 | Bad Request | Invalid data |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected error |

---

## Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Rate Limiting

Global limit: 100 requests per 15 minutes
Auth limit: 10 requests per 60 seconds

Headers returned:
```
X-RateLimit-Remaining: 99
Retry-After: 300
```

---

## Timestamps

All responses include ISO 8601 timestamps:
```
"createdAt": "2024-03-17T10:30:00.000Z"
"updatedAt": "2024-03-17T10:30:00.000Z"
```

---

## Total Endpoints Summary

| Category | Public | Authenticated | Admin | Total |
|----------|--------|----------------|-------|-------|
| Scheduled Rides | 0 | 6 | 0 | 6 |
| Favorites | 0 | 5 | 0 | 5 |
| Emergency | 0 | 6 | 0 | 6 |
| Reviews | 3 | 2 | 0 | 5 |
| Promotions | 2 | 1 | 2 | 5 |
| Wallet | 0 | 4 | 0 | 4 |
| Subscriptions | 1 | 3 | 0 | 4 |
| Insurance | 1 | 3 | 0 | 4 |
| Earnings | 0 | 4 | 0 | 4 |
| Vehicles | 0 | 6 | 0 | 6 |
| Surge Pricing | 1 | 0 | 4 | 5 |
| Support | 0 | 4 | 1 | 5 |
| FAQ | 3 | 1 | 2 | 6 |
| Settings | 0 | 5 | 0 | 5 |
| Zones | 2 | 0 | 4 | 6 |
| Loyalty | 1 | 4 | 0 | 5 |
| Referrals | 0 | 4 | 0 | 4 |
| Training | 2 | 2 | 0 | 4 |
| Feedback | 1 | 3 | 0 | 4 |
| Lost & Found | 2 | 4 | 0 | 6 |
| **TOTAL** | **19** | **72** | **13** | **104** |

---

**Last Updated:** March 17, 2026
**API Version:** 2.1.0
**Status:** Production Ready
