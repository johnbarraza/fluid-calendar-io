# FluidCalendar

An open-source alternative to Motion, designed for intelligent task scheduling and calendar management. FluidCalendar helps you stay on top of your tasks with smart scheduling capabilities, calendar integration, and customizable workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## About

FluidCalendar is built for people who want full control over their scheduling workflow. It combines the power of automatic task scheduling with the flexibility of open-source software. Read more about the journey and motivation in [Part 1 of my blog series](https://medium.com/front-end-weekly/fluid-calendar-an-open-source-alternative-to-motion-part-1-7a5b52bf219d).

![Snagit 2024 2025-02-16 12 33 23](https://github.com/user-attachments/assets/515381e9-b961-475d-a272-d454ecca59cb)


## Try the SaaS Version

Don't want to self-host? We're currently beta testing our hosted version at [FluidCalendar.com](https://fluidcalendar.com). Sign up for the waitlist to be among the first to experience the future of intelligent calendar management, with all the features of the open-source version plus:

- Managed infrastructure
- Automatic updates
- Premium support
- Advanced AI features

## Features

- 🤖 **Intelligent Task Scheduling** - Automatically schedule tasks based on your preferences and availability
- 📅 **Calendar Integration** - Seamless sync with Google Calendar (more providers coming soon)
- ⚡ **Smart Time Slot Management** - Finds optimal time slots based on your work hours and buffer preferences
- 🎨 **Modern UI** - Clean, responsive interface with smooth transitions
- 🔧 **Customizable** - Adjust scheduling algorithms and preferences to your needs
- 🔒 **Privacy-Focused** - Self-host your own instance

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Prisma for database management
- FullCalendar for calendar UI
- NextAuth.js for authentication
- Tailwind CSS for styling

## Prerequisites

- Node.js (version specified in `.nvmrc`)
- A Google Cloud Project (for Google Calendar integration)

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure the following environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `NEXTAUTH_URL`: Your application URL
- `NEXTAUTH_SECRET`: Random string for session encryption

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fluid-calendar.git
cd fluid-calendar
```

2. Install dependencies:
```bash
npm install
```

3. Run database migrations:
```bash
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Need Professional Help?

Don't want to handle the migration yourself? We offer a complete done-for-you service that includes:

- Managed OpenProject hosting
- Complete Jira migration
- 24/7 technical support
- Secure and reliable infrastructure

Visit [portfolio.elitecoders.co/openproject](https://portfolio.elitecoders.co/openproject) to learn more about our managed OpenProject migration service.

## About

This project was built by [EliteCoders](https://www.elitecoders.co), a software development company specializing in custom software solutions. If you need help with:

- Custom software development
- System integration
- Migration tools and services
- Technical consulting

Please reach out to us at hello@elitecoders.co or visit our website at [www.elitecoders.co](https://www.elitecoders.co).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.
