# 🚀 LeadFlow  
### Smart, Role-Based Lead Management System

---

## 📌 Overview

**LeadFlow** is a role-based lead management platform designed to bring **structure, accountability, and efficiency** to sales operations.  
It enforces a clear hierarchy where:

- **Admins** manage the system  
- **Managers** handle teams  
- **Executives** focus on follow-ups and conversions  

This ensures **no lead is missed** and **every action is tracked**.

---

## ✨ Key Features

- 🔄 Automatic & Manual Lead Assignment  
- 👥 Role-Based Access Control (RBAC)  
- 🔔 Real-Time Notifications & Follow-Up Reminders  
- 📝 Lead Notes & Follow-Up Scheduling  
- 📊 Performance Dashboards  
- 📱 Mobile-First, Scalable Design  

---

## 👥 User Roles & Permissions

### 🛡️ Admin
- Add, edit, deactivate, and remove all users (Admins, Managers, Executives)
- Assign and reassign leads to Managers
- View complete system dashboards and analytics
- Full system control with override permissions

---

### 🧑‍💼 Manager
- Add and remove Executives within their team
- Assign and reassign leads to Executives
- View team performance and follow-up status
- Receive alerts for overdue follow-ups

---

### 👨‍💻 Executive
- View only assigned leads
- Update lead status
- Add notes and set follow-up dates
- Receive assignment and reminder notifications
- No access to user management

---

## 📝 Lead Information

Each lead includes the following fields:

### Basic Details
- 👤 Name  
- 📞 Mobile Number  
- 🛠️ Service Type  
- 🌆 City  
- 🔗 Source (Website, Facebook, Referral, etc.)

### System Fields
- 📌 **Status:** New / Follow-up / Converted / Closed  
- 👥 Assigned Manager & Executive  
- 📅 Follow-Up Date (DateTime)  
- 🕒 Created & Updated Timestamps  

---

## 🔄 Lead Workflow

1. ➕ Lead Created *(Status: New)*  
2. 🛡️ Admin assigns lead to Manager  
3. 🧑‍💼 Manager assigns lead to Executive  
4. 👨‍💻 Executive follows up and converts or closes  

### Rules
- Leads **cannot skip hierarchy levels**
- Follow-up date is **mandatory** for “Follow-up” status
- Converted/Closed leads are **locked** (Admin override only)

---

## 📊 Dashboards

### 🛡️ Admin Dashboard
- Total Leads  
- Today’s Follow-ups  
- Executive-wise Performance  
- Conversion & Closure Metrics  

---

### 🧑‍💼 Manager Dashboard
- Team Leads Overview  
- Today & Overdue Follow-ups  
- Executive Performance Summary  

---

### 👨‍💻 Executive Dashboard
- My Assigned Leads  
- Today’s Follow-ups  
- Overdue Reminders  

---

## 🔔 Notifications

LeadFlow includes a built-in notification system for:

- 🆕 New Lead Assignments  
- ⏰ Same-Day Follow-Up Reminders  
- ⚠️ Overdue Follow-Up Alerts  

### Delivery Channels
- In-app notifications  
- Push notifications *(mobile-ready)*  
- WhatsApp / Email *(future-ready)*  

---

## 🔐 Security & Stability

- Role-Based Permission Enforcement (RBAC)  
- Secure User Authentication  
- Defensive API Error Handling (no app crashes)  
- Database Schema Validation & Health Checks  
- Optimized for High Lead Volume  

---

## 🚀 Getting Started

1. Set up the database and run migrations  
2. Create an **Admin** account  
3. Add **Managers** and **Executives**  
4. Start adding and assigning leads  

---

## 🎯 Vision

**LeadFlow** is built for high-performance sales teams that need **speed, visibility, and accountability**.  
It replaces chaos with structure and ensures **every lead gets the attention it deserves**.

---

⭐ If you find this project useful, consider giving it a star!
