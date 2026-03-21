from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Column, Boolean # Added Boolean
from sqlalchemy.orm import relationship
from .database import Base
import enum
from sqlalchemy import Enum

class AccountType(str, enum.Enum):
    SAVINGS = "SAVINGS"
    LIQUID_FUND = "LIQUID_FUND"
    CASH = "CASH"               # For physical wallet/cash tracking
    CREDIT_CARD = "CREDIT_CARD" # For tracking what you owe (Liability)
    EQUITY = "EQUITY"           # For direct stocks or Equity Mutual Funds

class AccountPurpose(str, enum.Enum):
    EMERGENCY = "EMERGENCY"     # For your Liquid Funds
    INVESTMENT = "INVESTMENT"   # For your 20% Wealth Building
    GENERAL = "GENERAL"         # For your 50% Needs
    TAX_SAVING = "TAX_SAVING"   # Specifically for ELSS/PPF/Insurance
    LIFESTYLE = "LIFESTYLE"     # For your 30% Wants (Vacation fund, etc.)

class TransactionType(str, enum.Enum):
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"
    INCOME = "INCOME"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # "Ashish" or "Wife"
    email = Column(String, unique=True, nullable=False) # "
    hashed_password = Column(String, nullable=False)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    percentage = Column(Float)  # % of parent for your formulas
    parent = relationship("Category", remote_side=[id], backref="children")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False) # e.g., "HDFC Savings"
    # WHAT it is (Used for interest/liquidity logic)
    account_type = Column(Enum(AccountType), nullable=False) # "SAVINGS" or "LIQUID_FUND"
    # WHY you have it (Used for your financial formula)
    purpose = Column(Enum(AccountPurpose), nullable=False) # "EMERGENCY", "INVESTMENT", or "GENERAL"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    balance = Column(Float, default=0.0)
    # Tracks where the money physically sits

class EmergencyFund(Base):
    __tablename__ = "emergency_fund"
    id = Column(Integer, primary_key=True)
    target_amount = Column(Float, nullable=False) # Your constant "Shield" value
    current_balance = Column(Float, default=0.0) 
    # Logic: Income enters, fills this first if current < target.

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    from_account_id = Column(Integer, ForeignKey("accounts.id"))
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True) # Only for transfers
    category_id = Column(Integer, ForeignKey("categories.id"))
    user_id = Column(Integer, ForeignKey("users.id")) # Who spent it
    note = Column(String)

class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)  # "Home Loan Prepayment"
    target_amount = Column(Float)
    deadline = Column(Date)
    category_id = Column(Integer, ForeignKey("categories.id")) # Link to track progress
    is_recurring = Column(Boolean, default=False)
    frequency_months = Column(Integer, default=0) # e.g., 6 for your loan



class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String) # For you or your wife
    report_type = Column(String) # e.g., "Blood Test", "Prescription"
    tags = Column(String) # Comma-separated tags like "diabetes,annual_checkup"
    report_date = Column(Date)
    doctor_name = Column(String, nullable=True)
    cloudinary_url = Column(String) # The "secure_url" from Cloudinary
    public_id = Column(String) # Needed if you ever want to delete the file
    is_critical = Column(Boolean, default=False)