from pydantic import BaseModel
from datetime import date
from typing import Optional, List
from .models import TransactionType

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str  # Only used when creating, never sent back in GET

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True # Allows Pydantic to read SQLAlchemy models

class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    percentage: Optional[float] = None

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    # This allows you to see sub-categories inside a parent category
    children: List["Category"] = [] 
    
    class Config:
        from_attributes = True

from .models import AccountType, AccountPurpose

class AccountBase(BaseModel):
    name: str
    account_type: AccountType
    purpose: AccountPurpose
    user_id: int
    balance: float = 0.0

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: int
    class Config:
        from_attributes = True

class EmergencyFundBase(BaseModel):
    target_amount: float

class EmergencyFundCreate(EmergencyFundBase):
    pass

class EmergencyFundStatus(EmergencyFundBase):
    current_balance: float
    is_full: bool
    gap: float

class TransactionCreate(BaseModel):
    date: date
    amount: float
    type: TransactionType
    user_id: int
    category_id: Optional[int] = None
    from_account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    note: Optional[str] = None

class TransactionBulkCreate(BaseModel):
    transactions: List[TransactionCreate]

class MilestoneBase(BaseModel):
    name: str
    target_amount: float
    deadline: date
    category_id: int
    is_recurring: Optional[bool] = False
    frequency_months: Optional[int] = 0

class MilestoneCreate(MilestoneBase):
    pass

class Milestone(MilestoneBase):
    id: int
    class Config:
        from_attributes = True