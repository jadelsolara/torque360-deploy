# TORQUE 360 Financial Model

## 1. Revenue Model

### Tier Pricing

| Tier | Monthly Price (USD) | Monthly Price (CLP) | Activation Fee (USD) | Activation Fee (CLP) | Implementation Fee (USD) | Implementation Fee (CLP) |
|------|---------------------|---------------------|----------------------|----------------------|--------------------------|--------------------------|
| Taller | $49 | 40,000 | $200 | 160,000 | $500 | 400,000 |
| Multi-sucursal | $149 | 120,000 | $200 | 160,000 | $1,000 | 800,000 |
| Enterprise | $499 | 400,000 | $200 | 160,000 | $2,000 | 1,600,000 |

### Expansion Revenue

- **Additional Users**: $10/user/month (CLP 8,000/user/month)
- **Additional Modules**: $50/module/month (CLP 40,000/module/month)
- **Integrations**: $100/integration (CLP 80,000/integration)

## 2. Unit Economics

### CAC (Customer Acquisition Cost)

- **Field Sales (Arturo)**: $1,000 per customer (CLP 800,000)
- **Traccion Pipeline**: $500 per customer (CLP 400,000)
- **Average CAC**: $750 (CLP 600,000)

### LTV (Lifetime Value)

- **Taller**: $1,764 (36 months * $49)
- **Multi-sucursal**: $5,364 (36 months * $149)
- **Enterprise**: $17,964 (36 months * $499)

### LTV:CAC Ratio

- **Taller**: 2.35 (1,764 / 750)
- **Multi-sucursal**: 7.15 (5,364 / 750)
- **Enterprise**: 23.95 (17,964 / 750)

### ARPU (Average Revenue Per User)

- **Blended ARPU**: $200 (weighted average across tiers)

### Net Revenue Retention

- **Target**: > 110% (expansion from modules + users)

## 3. Cost Structure

### Infrastructure

- **Hetzner/Cloudflare**: $200/month (CLP 160,000)
- **S3 Storage**: $50/month (CLP 40,000)
- **Database (PostgreSQL)**: $100/month (CLP 80,000)

### Team

- **Jose Antonio (CTO/founder)**: $5,000/month (CLP 4,000,000)
- **Arturo (Sales/Field)**: $3,000/month (CLP 2,400,000)

### Variable Costs

- **SII Integration**: $0.05/transaction (CLP 40/transaction)
- **Payment Processing**: 2.9% + $0.30/transaction (CLP 2.32% + 24/transaction)
- **SMS**: $0.01/message (CLP 8/message)

### Support Costs

- **Initial Support**: $50/customer/month (CLP 4,000/customer/month)
- **Scaling Model**: $25/customer/month (CLP 2,000/customer/month) after 100 customers

## 4. Break-Even Analysis

### Fixed Monthly Costs

| Cost Item | Monthly Cost (USD) | Monthly Cost (CLP) |
|-----------|--------------------|--------------------|
| Infrastructure | $350 | 280,000 |
| Team | $8,000 | 6,400,000 |
| Marketing | $500 | 400,000 |
| Legal | $200 | 160,000 |
| Office | $300 | 240,000 |
| **Total Fixed Costs** | **$9,350** | **7,480,000** |

### Variable Costs per Customer

| Cost Item | Cost per Customer (USD) | Cost per Customer (CLP) |
|-----------|-------------------------|-------------------------|
| SII Integration | $0.05/transaction | 40/transaction |
| Payment Processing | 2.9% + $0.30/transaction | 2.32% + 24/transaction |
| SMS | $0.01/message | 8/message |
| Support | $50/month (initial) | 4,000/month (initial) |
| **Total Variable Costs** | **$50.35/month** | **4,028/month** |

### Break-Even: Number of Customers Needed

- **Taller**: 187 customers
- **Multi-sucursal**: 63 customers
- **Enterprise**: 19 customers

### Timeline to Break-Even from Fase 1 Launch

- **Month 12**: 100 customers (mixed tiers)
- **Month 18**: 200 customers (mixed tiers)
- **Month 24**: 300 customers (mixed tiers)

## 5. Cash Flow Projections (36 months)

### Month-by-Month for Year 1

| Month | Revenue (USD) | Revenue (CLP) | Fixed Costs (USD) | Fixed Costs (CLP) | Variable Costs (USD) | Variable Costs (CLP) | Net Cash Flow (USD) | Net Cash Flow (CLP) |
|-------|---------------|---------------|-------------------|-------------------|----------------------|----------------------|---------------------|---------------------|
| 1     | 1,000         | 800,000       | 9,350             | 7,480,000         | 50.35                | 4,028                | -8,400.35           | -6,484,028          |
| 2     | 2,000         | 1,600,000     | 9,350             | 7,480,000         | 100.70               | 8,056                | -7,450.70           | -5,888,056          |
| 3     | 3,000         | 2,400,000     | 9,350             | 7,480,000         | 151.05               | 12,084               | -6,501.05           | -5,172,084          |
| 4     | 4,000         | 3,200,000     | 9,350             | 7,480,000         | 201.40               | 16,112               | -5,551.40           | -4,476,112          |
| 5     | 5,000         | 4,000,000     | 9,350             | 7,480,000         | 251.75               | 20,140               | -4,601.75           | -3,760,140          |
| 6     | 6,000         | 4,800,000     | 9,350             | 7,480,000         | 302.10               | 24,168               | -3,652.10           | -2,964,168          |
| 7     | 7,000         | 5,600,000     | 9,350             | 7,480,000         | 352.45               | 28,196               | -2,702.45           | -2,168,196          |
| 8     | 8,000         | 6,400,000     | 9,350             | 7,480,000         | 402.80               | 32,224               | -1,752.80           | -1,372,224          |
| 9     | 9,000         | 7,200,000     | 9,350             | 7,480,000         | 453.15               | 36,252               | -703.15             | -528,252            |
| 10    | 10,000        | 8,000,000     | 9,350             | 7,480,000         | 503.50               | 40,280               | 296.50              | 2,520,000           |
| 11    | 11,000        | 8,800,000     | 9,350             | 7,480,000         | 553.85               | 44,308               | 1,096.15            | 3,376,000           |
| 12    | 12,000        | 9,600,000     | 9,350             | 7,480,000         | 604.20               | 48,336               | 2,045.80            | 4,240,000           |

### Quarterly for Years 2-3

| Quarter | Revenue (USD) | Revenue (CLP) | Fixed Costs (USD) | Fixed Costs (CLP) | Variable Costs (USD) | Variable Costs (CLP) | Net Cash Flow (USD) | Net Cash Flow (CLP) |
|---------|---------------|---------------|-------------------|-------------------|----------------------|----------------------|---------------------|---------------------|
| Q1 Y2   | 36,000        | 28,800,000    | 28,050            | 22,440,000        | 1,812.60             | 14,500,800           | 6,137.40            | 1,859,200           |
| Q2 Y2   | 48,000        | 38,400,000    | 28,050            | 22,440,000        | 2,416.80             | 19,334,400           | 17,533.20           | 2,625,600           |
| Q3 Y2   | 60,000        | 48,000,000    | 28,050            | 22,440,000        | 3,021.00             | 24,168,000           | 28,929.00           | 3,398,400           |
| Q4 Y2   | 72,000        | 57,600,000    | 28,050            | 22,440,000        | 3,625.20             | 28,902,400           | 40,324.80           | 4,167,600           |
| Q1 Y3   | 84,000        | 67,200,000    | 28,050            | 22,440,000        | 4,229.40             | 33,636,000           | 51,720.60           | 4,944,000           |
| Q2 Y3   | 96,000        | 76,800,000    | 28,050            | 22,440,000        | 4,833.60             | 38,668,800           | 63,116.40           | 5,731,200           |
| Q3 Y3   | 108,000       | 86,400,000    | 28,050            | 22,440,000        | 5,437.80             | 43,501,600           | 74,512.20           | 6,528,000           |
| Q4 Y3   | 120,000       | 96,000,000    | 28,050            | 22,440,000        | 6,042.00             | 48,334,400           | 85,908.00           | 7,320,000           |

### Key Assumptions

- **Customer Growth**: 10% MoM for the first 12 months, 5% MoM for the next 24 months
- **Churn Rate**: 2% monthly
- **Variable Costs**: Increase linearly with customer growth
- **Fixed Costs**: Increase by 5% annually

### Sensitivity Analysis

| Scenario | Revenue (Y3) | Net Cash Flow (Y3) |
|----------|--------------|--------------------|
| Optimistic | $480,000     | $343,632           |
| Base      | $360,000     | $257,724           |
| Conservative | $240,000    | $171,816           |

## 6. Funding Strategy

### Bootstrap Phase (Fase 1-2)

- **Revenue from Traccion Consulting**: $10,000/month (CLP 800,000)

### Growth Phase (Fase 3+)

- **CORFO**: Government grants and loans
- **Angel Investors**: Seed funding from local investors
- **Revenue-Funded**: Revenue-based financing from existing customers

### Capital Efficiency Metrics

- **Burn Rate**: $9,350/month (CLP 7,480,000)
- **Runway**: 12 months (initial)

## 7. Key Metrics Dashboard

### Monthly Metrics

| Metric | Value (USD) | Value (CLP) |
|--------|-------------|-------------|
| MRR (Monthly Recurring Revenue) | $12,000 (Month 12) | 9,600,000 (Month 12) |
| ARR (Annual Recurring Revenue) | $144,000 (Year 1) | 115,200,000 (Year 1) |
| MoM Growth Rate | 10% (Month 12) | 10% (Month 12) |
| Churn Rate | 2% (target < 3%) | 2% (target < 3%) |
| Gross Margin | 80% (target > 80%) | 80% (target > 80%) |
| Burn Rate | $9,350/month | 7,480,000/month |
| Runway | 12 months | 12 months |

### Quarterly Metrics

| Metric | Q1 Y2 | Q2 Y2 | Q3 Y2 | Q4 Y2 | Q1 Y3 | Q2 Y3 | Q3 Y3 | Q4 Y3 |
|--------|-------|-------|-------|-------|-------|-------|-------|-------|
| MRR (Monthly Recurring Revenue) | $30,000 | $40,000 | $50,000 | $60,000 | $70,000 | $80,000 | $90,000 | $100,000 |
| ARR (Annual Recurring Revenue) | $360,000 | $480,000 | $600,000 | $720,000 | $840,000 | $960,000 | $1,080,000 | $1,200,000 |
| MoM Growth Rate | 10% | 10% | 10% | 10% | 10% | 10% | 10% | 10% |
| Churn Rate | 2% | 2% | 2% | 2% | 2% | 2% | 2% | 2% |
| Gross Margin | 80% | 80% | 80% | 80% | 80% | 80% | 80% | 80% |
| Burn Rate | $9,350/month | $9,350/month | $9,350/month | $9,350/month | $9,350/month | $9,350/month | $9,350/month | $9,350/month |
| Runway | 12 months | 12 months | 12 months | 12 months | 12 months | 12 months | 12 months | 12 months |

This financial model provides a comprehensive overview of the revenue, costs, and key metrics for TORQUE 360, ensuring a clear path to profitability and sustainable growth.