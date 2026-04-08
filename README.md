# Agentic AI and Blockchain-Based Payment Gateway

Enabling Global NGOs to Ensure Transparent and Secure Fund Management

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [For Donors](#for-donors)
  - [For NGOs](#for-ngos)
- [Future Scope](#future-scope)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

## Introduction

Non-Governmental Organizations (NGOs) often face challenges in securing and managing funds transparently. Issues such as misuse, lack of accountability, and difficulties in tracking donations can undermine donor trust and reduce the effectiveness of social initiatives. Traditional payment systems are fragmented and prone to fraud, making it hard to provide donors with clear proof of fund usage.

To address these challenges, we have developed a platform that leverages agentic AI and blockchain technology to enable NGOs to manage funds transparently and securely. This platform allows donors to contribute using cryptocurrency, ensuring that fund allocation and usage are both transparent and accountable.

## Features

- **Cryptocurrency Donations**: Donors can contribute to NGO campaigns using digital wallets, ensuring secure and transparent transactions.
- **AI-Driven Campaign Validation**: AI algorithms assist in validating NGO campaigns, reducing the need for manual verification and expediting the approval process.
- **Smart Contract Management**: Funds are held in Ethereum-based smart contracts and released to NGOs upon reaching predefined campaign milestones, ensuring accountability.
- **Real-Time Notifications**: Donors receive notifications when their donated funds are withdrawn by NGOs for campaign use, enhancing transparency.

## Getting Started

### Prerequisites

- A digital wallet compatible with Ethereum-based cryptocurrencies (e.g., MetaMask).
- Access to the internet and a web browser.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Harshvardhan-18/DonateETH.git
   ```
2. Navigate to the project directory (Frontend):
   ```bash
   cd DonateETH/fe
   ```
3. Install the necessary dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

   If you're running the backend locally, set the frontend API base URL:
   ```bash
   cp .env.local.example .env.local
   # ensure NEXT_PUBLIC_API_BASE_URL matches your backend (e.g. http://localhost:5003)
   ```
5. Navigate to the project directory (Backend):
   ```bash
   cd ../be
   ```
6. Install the necessary dependencies:
   ```bash
   npm install
   ```
7. Configure environment variables (Prisma + server):
   ```bash
   cp .env.example .env
   # then set DATABASE_URL (PostgreSQL connection string)
   ```
8. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
9. Apply migrations to your database:
   ```bash
   npm run prisma:migrate
   ```
10. Start the backend server:
   ```bash
   npm run dev
   ```

## Usage

### For Donors

1. **Connect Digital Wallet**: Visit our platform and connect your digital wallet to log in.
2. **Browse Campaigns**: Explore various fundraising campaigns initiated by NGOs.
3. **Donate**: Select a campaign and donate using your cryptocurrency wallet.
4. **Track Donations**: Monitor the status of your donations and receive notifications when funds are withdrawn by the NGO for campaign milestones.

### For NGOs

1. **Create Account**: Register on our platform and complete the necessary verification.
2. **Initiate Campaign**: Create a fundraising campaign detailing objectives, required funds, and milestones.
3. **AI Validation**: Submit the campaign for AI-assisted validation to ensure compliance and authenticity.
4. **Fund Withdrawal**: Upon reaching campaign milestones, request fund withdrawal. The smart contract will release the appropriate funds, and donors will be notified.

## Admin Panel Architecture

### Folder Structure

```text
be/
  admin/
    config.js
    router.js
    middleware/
      auth.js
    services/
      blockchain.js
    examples/
      contract-interaction.js
  prisma/
    schema.prisma

fe/
  app/
    admin/
      login/page.tsx
      page.tsx
  lib/
    admin-api.ts
  middleware.ts
```

### Admin Features Included

- JWT-based admin authentication with role checks (`/admin/auth/login`)
- Protected admin routes (backend middleware + frontend route middleware)
- Dashboard metrics: total ETH/INR, NGO count, active campaigns, recent transactions
- NGO moderation: approve/reject/suspend/activate, campaign visibility per NGO
- Donation tracking: donor wallet, NGO wallet, amount, transaction hash + Etherscan URL
- Blockchain sync endpoint using Ethers.js event fetching (`/admin/transactions/sync`)
- Document verification pipeline for IPFS CIDs with approve/reject actions
- User management for donor/NGO users with block/unblock controls
- Analytics endpoints for donation trends, top NGOs, and active donors
- Security controls: input validation (Zod), rate limiting, helmet, duplicate tx prevention

## Future Scope

- **Multi-Currency Support**: Implement tokenization to support donations in various fiat currencies like Rupees or Dollars, converting them into digital tokens stored in smart contracts.
- **Enhanced Validation Methods**: Introduce multiple validation mechanisms to strictly authenticate and approve NGO campaigns, ensuring higher levels of trust and security.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

- **Project Maintainer**: Team Committed

- **Project Link**: https://github.com/Harshvardhan-18/DonateETH.git

## Acknowledgments

We would like to thank the following resources and libraries that have been instrumental in developing this project:

- **Ethereum** for providing the blockchain infrastructure.
- **MetaMask** for facilitating digital wallet integration.
- **OpenAI** for advancements in AI technologies.
- **Shields.io** for providing badges.
- **Awesome README** for README inspiration.
- **Emoji Cheat Sheet** for emoji support.

